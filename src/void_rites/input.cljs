(ns void-rites.input
  (:require [void-rites.state :as state]
            [void-rites.effects :as effects]
            [void-rites.constants :as c]))

;; Hit detection helpers
(defn in-rect? [mx my x y w h]
  (and (>= mx x) (<= mx (+ x w))
       (>= my y) (<= my (+ y h))))

;; Determine which die was clicked
(defn die-at [mx my dice]
  (let [x0 20 y0 380 die-w 48 die-gap 58]
    (loop [i 0]
      (when (< i (count dice))
        (let [dx (+ x0 (* i die-gap))]
          (if (in-rect? mx my dx y0 die-w die-w)
            i
            (recur (inc i))))))))

;; Determine which equipment slot was clicked -> [equip-idx slot-idx]
(defn slot-at [mx my player]
  (let [all-equip (concat (:artifacts player) (:spells player))
        x0 62 y0 450]
    (loop [i 0 equip-list all-equip]
      (when (seq equip-list)
        (let [equip (first equip-list)
              ey (+ y0 (* i 78))
              num-slots (:slots equip)
              slot-w 40 slot-h 24
              slot-y (+ ey 44)]
          (let [found-slot
                (loop [j 0]
                  (when (< j num-slots)
                    (let [sx (+ x0 (* j 46))]
                      (if (in-rect? mx my sx slot-y slot-w slot-h)
                        j
                        (recur (inc j))))))]
            (if (some? found-slot)
              {:equip-idx i :slot-idx found-slot}
              (recur (inc i) (rest equip-list))))))))))

;; Determine if reroll/end-turn button clicked
(defn button-at [mx my]
  (cond
    (in-rect? mx my 450 380 140 36) :reroll
    (in-rect? mx my 600 380 140 36) :end-turn
    :else nil))

;; Equip card double-click area (to activate)
(defn equip-activate-at [mx my player]
  (let [all-equip (concat (:artifacts player) (:spells player))
        x0 20 y0 450 w 420]
    (loop [i 0 equip-list all-equip]
      (when (seq equip-list)
        (let [ey (+ y0 (* i 78))]
          (if (in-rect? mx my x0 ey w 70)
            i
            (recur (inc i) (rest equip-list))))))))

(defn handle-combat-click! [mx my]
  (let [s @state/game-state
        combat (:combat s)
        player (:player s)
        dice (:player-dice combat)
        sel-die (:selected-die s)
        sel-slot (:selected-slot s)]
    ;; Check buttons first
    (if-let [btn (button-at mx my)]
      (case btn
        :reroll (state/reroll-free-dice!)
        :end-turn (do
                    (state/apply-enemy-attack!)
                    (if (state/player-dead?)
                      (swap! state/game-state assoc :screen :game-over)
                      (if (state/enemy-dead?)
                        (swap! state/game-state assoc :screen :loot)
                        (do
                          (state/start-player-turn!)
                          (state/set-enemy-intent!))))))
      ;; Not a button - check die clicks
      (let [clicked-die (die-at mx my dice)]
        (cond
          ;; Clicking a die: select it
          (and (some? clicked-die)
               (not= (get dice clicked-die) :used))
          (swap! state/game-state assoc :selected-die clicked-die)

          ;; Clicking a slot when a die is selected: slot the die
          (and (some? sel-die)
               (some? (slot-at mx my player)))
          (let [slot (slot-at mx my player)
                eq-idx (:equip-idx slot)
                sl-idx (:slot-idx slot)]
            (state/slot-die! sel-die eq-idx sl-idx)
            (swap! state/game-state assoc :selected-die nil :selected-slot nil))

          ;; Clicking an already-slotted slot: unslot
          (some? (slot-at mx my player))
          (let [slot (slot-at mx my player)]
            (state/unslot-die! (:equip-idx slot) (:slot-idx slot)))

          ;; Clicking an equipment card body (activate)
          (some? (equip-activate-at mx my player))
          (effects/try-activate-equipment! (equip-activate-at mx my player))

          :else
          (swap! state/game-state assoc :selected-die nil :selected-slot nil))))))

(defn handle-title-click! []
  (let [player {:hp 30 :max-hp 30
                :sanity 10 :max-sanity 10
                :artifacts []
                :spells []
                :max-artifact-slots 3
                :max-spell-slots 2}
        first-enemy (first (filter #(= (:tier %) 1) c/ENEMIES))]
    (swap! state/game-state assoc
           :screen :combat
           :floor 1
           :player player
           :run-loot [])
    (state/init-combat! first-enemy)
    (state/start-player-turn!)
    (state/set-enemy-intent!)))

(defn handle-loot-click! [mx my loot-options]
  (let [w 200]
    (doseq [[i item] (map-indexed vector loot-options)]
      (let [cx (+ 100 (* i 230))
            cy 195
            btn-x (+ cx 40) btn-y (+ cy 195)]
        (when (in-rect? mx my btn-x btn-y 120 35)
          (let [type (if (some #(= (:id item) (:id %)) c/ARTIFACTS) :artifact :spell)]
            (state/add-to-inventory! item type))
          (let [next-floor (inc (:floor @state/game-state))
                floors c/FLOORS
                next-floor-def (first (filter #(= (:id %) next-floor) floors))]
            (if next-floor-def
              (let [enemies (:enemies next-floor-def)
                    enemy-id (rand-nth enemies)
                    enemy-def (first (filter #(= (:id %) enemy-id) c/ENEMIES))]
                (state/advance-floor!)
                (state/init-combat! enemy-def)
                (state/start-player-turn!)
                (state/set-enemy-intent!)
                (swap! state/game-state assoc :screen :combat))
              (swap! state/game-state assoc :screen :victory))))))))

(defn handle-gameover-click! [mx my]
  (when (in-rect? mx my (- 400 80) (+ 300 70) 160 40)
    (swap! state/game-state assoc
           :screen :title
           :floor 1
           :combat nil
           :run-loot [])))

(defn handle-victory-click! [mx my]
  (when (in-rect? mx my (- 400 80) (+ 300 70) 160 40)
    (swap! state/game-state assoc
           :screen :title
           :floor 1
           :combat nil
           :run-loot [])))

(defn handle-hover! [mx my screen]
  (case screen
    :combat
    (let [btn (button-at mx my)]
      (swap! state/game-state assoc :hover btn))
    nil))
