(ns void-rites.effects
  (:require [void-rites.state :as state]
            [void-rites.constants :as c]))

;; Check if slotted dice satisfy an equipment's requirements
(defn slots-filled? [equip slot-vals]
  (let [num-slots (:slots equip)
        all-vals (map #(get slot-vals %) (range num-slots))]
    (every? some? all-vals)))

(defn dice-vals-from-slots [slot-vals num-slots]
  (map #(get slot-vals %) (range num-slots)))

(defn satisfies-requirement? [equip slot-vals]
  (let [req (get-in equip [:active :required])
        num-slots (:slots equip)
        vals (vec (dice-vals-from-slots slot-vals num-slots))]
    (when (every? some? vals)
      (let [r (first req)]
        (cond
          (= req [:any]) true
          (= req [:pair]) (apply = vals)
          (= req [:triple]) (apply = vals)
          (= req [:odd]) (every? odd? vals)
          (= req [:sequence-low]) (and (= (count vals) 2)
                                       (or (= (sort vals) [1 2])))
          (set? r) (every? #(contains? r %) vals)
          :else true)))))

(defn resolve-equipment! [equip-idx equip slot-vals]
  (let [effect-def (:active equip)
        effect (:effect effect-def)
        amount (:amount effect-def)
        num-slots (:slots equip)
        vals (vec (dice-vals-from-slots slot-vals num-slots))]
    (case effect
      :damage
      (do
        (swap! state/game-state
               update-in [:combat :enemy :current-hp]
               #(max 0 (- % amount)))
        (state/show-message! (str (:name equip) " deals " amount " damage!")))

      :damage-by-value
      (let [dmg (reduce + vals)]
        (swap! state/game-state
               update-in [:combat :enemy :current-hp]
               #(max 0 (- % dmg)))
        (state/show-message! (str (:name equip) " deals " dmg " damage!")))

      :heal
      (do
        (swap! state/game-state
               (fn [s]
                 (update-in s [:player :hp]
                            #(min (get-in s [:player :max-hp]) (+ % amount)))))
        (state/show-message! (str "Healed " amount " HP!")))

      :reroll-unslotted
      (do
        (swap! state/game-state update :combat
               (fn [c]
                 (update c :player-dice
                         #(mapv (fn [v] (if (= v :used) :used (inc (rand-int 6)))) %))))
        (state/show-message! "Rerolled all free dice!"))

      :enemy-skip
      (do
        (swap! state/game-state assoc-in [:combat :enemy-intent]
               {:ability {:name "Stunned" :dmg 0} :dice []})
        (state/show-message! "Enemy attack cancelled!"))

      :enemy-sanity-drain
      (do
        (state/show-message! (str "Enemy sanity drained! (effect)")))

      :reveal-intent
      (do
        (state/set-enemy-intent!)
        (state/show-message! "Enemy intent revealed!"))

      (state/show-message! (str "Activated: " (:name equip)))))
  ;; Mark equipment as used and clear slots
  (swap! state/game-state
         (fn [s]
           (-> s
               (update-in [:combat :used-equipment] conj equip-idx)
               (assoc-in [:combat :player-slots equip-idx] {})))))

(defn try-activate-equipment! [equip-idx]
  (let [s @state/game-state
        combat (:combat s)
        player (:player s)
        all-equip (concat (:artifacts player) (:spells player))
        equip (nth all-equip equip-idx nil)
        used (get-in s [:combat :used-equipment])
        slots (get-in s [:combat :player-slots equip-idx] {})
        slot-vals (into {} (for [[k v] slots] [k (:val v)]))]
    (cond
      (nil? equip) nil
      (contains? used equip-idx)
      (state/show-message! "Already used this turn!")

      (not (slots-filled? equip slot-vals))
      (state/show-message! "Fill all slots first!")

      (not (satisfies-requirement? equip slot-vals))
      (state/show-message! "Wrong dice values for this artifact!")

      :else
      (resolve-equipment! equip-idx equip slot-vals))))

;; Apply passive effects at turn start
(defn apply-passives! []
  (let [s @state/game-state
        player (:player s)
        artifacts (:artifacts player)]
    (doseq [[i equip] (map-indexed vector artifacts)]
      (when-let [passive (:passive equip)]
        (case (:effect passive)
          :bonus-roll
          (swap! state/game-state update-in [:combat :player-dice]
                 #(mapv (fn [v] (if (= v :used) :used (min 6 (+ v (:amount passive))))) %))
          nil)))))
