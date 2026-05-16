(ns void-rites.state
  (:require [void-rites.constants :as c]))

(defonce game-state
  (atom
   {:screen :title    ;; :title :floor-select :combat :loot :game-over :victory
    :player {:hp 30 :max-hp 30
             :sanity 10 :max-sanity 10
             :artifacts []
             :spells []
             :max-artifact-slots 3
             :max-spell-slots 2}
    :combat nil       ;; populated during combat
    :floor 1
    :run-loot []      ;; artifacts collected this run
    :hover nil        ;; UI hover state
    :selected-die nil ;; index of selected die
    :selected-slot nil;; {:equipment-idx N :slot-idx N}
    :anim-queue []    ;; pending animations
    :message nil      ;; floating message text
    :msg-timer 0}))

(defn init-combat! [enemy]
  (swap! game-state assoc :combat
         {:enemy (assoc enemy :current-hp (:hp enemy))
          :player-dice []
          :enemy-dice []
          :player-slots {}   ;; {equip-idx {slot-idx die-value}}
          :turn :player
          :turn-phase :roll  ;; :roll :slot :resolve
          :rerolls-left 1
          :used-equipment #{}  ;; set of equip-ids used this turn
          :enemy-intent nil
          :log []}))

(defn roll-n-dice [n]
  (vec (repeatedly n #(inc (rand-int 6)))))

(defn start-player-turn! []
  (let [player (:player @game-state)
        artifact-count (count (:artifacts player))
        spell-count (count (:spells player))
        dice-count (+ 3 (min artifact-count 2))]
    (swap! game-state update :combat
           #(assoc %
                   :player-dice (roll-n-dice dice-count)
                   :turn :player
                   :turn-phase :slot
                   :rerolls-left 1
                   :used-equipment #{}
                   :player-slots {}))))

(defn enemy-intent [enemy]
  (let [abilities (:abilities enemy)
        ability (rand-nth abilities)
        enemy-roll (roll-n-dice (:dice-count enemy))
        sorted-roll (vec (sort > enemy-roll))]
    {:ability ability :dice sorted-roll}))

(defn set-enemy-intent! []
  (let [enemy (get-in @game-state [:combat :enemy])]
    (swap! game-state assoc-in [:combat :enemy-intent]
           (enemy-intent enemy))))

(defn apply-enemy-attack! []
  (let [intent (get-in @game-state [:combat :enemy-intent])
        ability (:ability intent)
        dmg (or (:dmg ability) 0)
        effect (:effect ability)]
    (cond
      (and dmg (pos? dmg))
      (swap! game-state update-in [:player :hp] #(max 0 (- % dmg)))

      (= effect :sanity-drain)
      (swap! game-state update-in [:player :sanity]
             #(max 0 (- % (get ability :amount 1))))

      (= effect :skip-turn) nil)))

(defn player-dead? []
  (or (<= (get-in @game-state [:player :hp]) 0)
      (<= (get-in @game-state [:player :sanity]) 0)))

(defn enemy-dead? []
  (<= (get-in @game-state [:combat :enemy :current-hp]) 0))

(defn slot-die! [die-idx equipment-idx slot-idx]
  (let [die-val (get-in @game-state [:combat :player-dice die-idx])]
    (swap! game-state
           #(-> %
                (assoc-in [:combat :player-slots equipment-idx slot-idx] {:val die-val :die-idx die-idx})
                (assoc-in [:combat :player-dice die-idx] :used)))))

(defn unslot-die! [equipment-idx slot-idx]
  (let [slot-data (get-in @game-state [:combat :player-slots equipment-idx slot-idx])
        die-idx (:die-idx slot-data)
        die-val (:val slot-data)]
    (when slot-data
      (swap! game-state
             #(-> %
                  (assoc-in [:combat :player-slots equipment-idx slot-idx] nil)
                  (assoc-in [:combat :player-dice die-idx] die-val))))))

(defn reroll-free-dice! []
  (when (pos? (get-in @game-state [:combat :rerolls-left]))
    (swap! game-state
           (fn [s]
             (let [dice (:player-dice (:combat s))
                   new-dice (mapv #(if (= % :used) :used (inc (rand-int 6))) dice)]
               (-> s
                   (assoc-in [:combat :player-dice] new-dice)
                   (update-in [:combat :rerolls-left] dec)))))))

(defn add-to-inventory! [item type]
  (swap! game-state update-in [:player (if (= type :artifact) :artifacts :spells)] conj item))

(defn advance-floor! []
  (swap! game-state update :floor inc))

(defn show-message! [msg]
  (swap! game-state assoc :message msg :msg-timer 120))

(defn tick-message! []
  (when (pos? (:msg-timer @game-state))
    (swap! game-state update :msg-timer dec)
    (when (<= (:msg-timer @game-state) 0)
      (swap! game-state assoc :message nil))))
