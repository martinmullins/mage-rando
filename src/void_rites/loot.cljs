(ns void-rites.loot
  (:require [void-rites.constants :as c]
            [void-rites.state :as state]))

(defn all-items []
  (concat c/ARTIFACTS c/SPELLS))

(defn player-item-ids []
  (let [p (:player @state/game-state)]
    (set (map :id (concat (:artifacts p) (:spells p))))))

(defn generate-loot-options [floor-def]
  (let [count (:loot-count floor-def 2)
        owned (player-item-ids)
        pool (remove #(contains? owned (:id %)) (all-items))
        shuffled (shuffle pool)]
    (take count shuffled)))

(defn current-loot-options []
  (let [floor (:floor @state/game-state)
        floor-def (first (filter #(= (:id %) floor) c/FLOORS))]
    (when floor-def
      (generate-loot-options floor-def))))
