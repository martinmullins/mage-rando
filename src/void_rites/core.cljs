(ns void-rites.core
  (:require [play-cljs.core :as p]
            [void-rites.constants :as c]
            [void-rites.state :as state]
            [void-rites.render :as render]
            [void-rites.input :as input]
            [void-rites.loot :as loot]))

(defonce game (p/create-game c/CANVAS-W c/CANVAS-H))
(defonce loot-cache (atom nil))

(defn get-loot-options []
  (or @loot-cache
      (let [opts (loot/current-loot-options)]
        (reset! loot-cache opts)
        opts)))

(defn reset-loot-cache! []
  (reset! loot-cache nil))

(p/defgame game
  :on-init
  (fn []
    (.textFont (p/get-sketch game) "'Courier New', monospace"))

  :on-tick
  (fn []
    (let [s @state/game-state
          sketch (p/get-sketch game)]
      (state/tick-message!)
      (case (:screen s)
        :title    (render/draw-title sketch)
        :combat   (render/draw-combat sketch s)
        :loot     (do
                    (let [opts (get-loot-options)]
                      (render/draw-loot sketch opts nil)))
        :game-over (render/draw-game-over sketch nil)
        :victory   (render/draw-victory sketch)
        (.background sketch (get c/COLORS :void)))))

  :on-mouse-moved
  (fn [event]
    (let [s @state/game-state
          sketch (p/get-sketch game)
          mx (.-x event) my (.-y event)]
      (input/handle-hover! mx my (:screen s))
      ;; update hover for loot screen
      (when (= (:screen s) :loot)
        (let [opts (get-loot-options)
              hover-idx
              (loop [i 0]
                (when (< i (count opts))
                  (let [cx (+ 100 (* i 230))
                        cy 200 w 200 h 240]
                    (if (and (>= mx cx) (<= mx (+ cx w))
                             (>= my cy) (<= my (+ cy h)))
                      i
                      (recur (inc i))))))]
          (swap! state/game-state assoc :loot-hover hover-idx)))))

  :on-mouse-clicked
  (fn [event]
    (let [s @state/game-state
          mx (.-x event) my (.-y event)
          screen (:screen s)]
      (case screen
        :title      (do (reset-loot-cache!) (input/handle-title-click!))
        :combat     (input/handle-combat-click! mx my)
        :loot       (do
                      (let [opts (get-loot-options)]
                        (input/handle-loot-click! mx my opts))
                      (reset-loot-cache!))
        :game-over  (do (reset-loot-cache!) (input/handle-gameover-click! mx my))
        :victory    (do (reset-loot-cache!) (input/handle-victory-click! mx my))
        nil))))

(defn init []
  (p/start game))

(defn reload []
  (p/restart game))
