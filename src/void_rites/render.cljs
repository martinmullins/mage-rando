(ns void-rites.render
  (:require [play-cljs.core :as p]
            [void-rites.constants :as c]
            [void-rites.state :as state]))

;; ---- Primitives ----

(defn draw-rect [sketch x y w h color & {:keys [radius] :or {radius 0}}]
  (.fill sketch color)
  (.noStroke sketch)
  (if (pos? radius)
    (.rect sketch x y w h radius)
    (.rect sketch x y w h)))

(defn draw-rect-outline [sketch x y w h color stroke-w & {:keys [radius] :or {radius 0}}]
  (.noFill sketch)
  (.stroke sketch color)
  (.strokeWeight sketch stroke-w)
  (if (pos? radius)
    (.rect sketch x y w h radius)
    (.rect sketch x y w h))
  (.noStroke sketch))

(defn draw-text [sketch text x y color size & {:keys [align] :or {align :left}}]
  (.fill sketch color)
  (.noStroke sketch)
  (.textSize sketch size)
  (.textAlign sketch (case align
                       :center (.-CENTER sketch)
                       :right  (.-RIGHT sketch)
                       (.-LEFT sketch)))
  (.text sketch text x y))

(defn draw-glyph [sketch glyph x y color size]
  (.fill sketch color)
  (.noStroke sketch)
  (.textSize sketch size)
  (.textAlign sketch (.-CENTER sketch))
  (.text sketch glyph x y))

;; ---- Health / Sanity bars ----

(defn draw-bar [sketch x y w h cur max fg-color bg-color label]
  (draw-rect sketch x y w h (get c/COLORS :panel))
  (let [ratio (/ cur max)
        filled (int (* w ratio))]
    (draw-rect sketch x y filled h fg-color)
    (draw-rect-outline sketch x y w h (get c/COLORS :border) 1))
  (draw-text sketch (str label ": " cur "/" max) (+ x 4) (+ y 12)
             (get c/COLORS :text) 11))

;; ---- Die rendering ----

(defn die-color [val used?]
  (cond
    used? (get c/COLORS :die-used)
    :else (get c/COLORS :die-bg)))

(defn die-border-color [val used?]
  (cond
    used? (get c/COLORS :text-muted)
    (= val 6) (get c/COLORS :gold)
    (>= val 4) (get c/COLORS :accent2)
    :else (get c/COLORS :die-border)))

(defn draw-die [sketch x y size val used? selected?]
  (let [bg (die-color val used?)
        border (die-border-color val used?)
        sw (if selected? 2.5 1.5)]
    (draw-rect sketch x y size size bg :radius 6)
    (draw-rect-outline sketch x y size size border sw :radius 6)
    (when selected?
      (draw-rect-outline sketch (- x 3) (- y 3) (+ size 6) (+ size 6)
                         (get c/COLORS :accent) 2 :radius 9))
    (when-not (= val :used)
      (draw-text sketch (str val) (+ x (/ size 2)) (+ y (/ size 2) 6)
                 (if used? (get c/COLORS :text-muted) (get c/COLORS :text))
                 (if (= size 48) 22 18) :align :center))))

;; ---- Equipment slot ----

(defn draw-slot [sketch x y w h filled? val]
  (let [bg (if filled? (get c/COLORS :slot-full) (get c/COLORS :slot-empty))]
    (draw-rect sketch x y w h bg :radius 5)
    (draw-rect-outline sketch x y w h (get c/COLORS :border) 1 :radius 5)
    (when filled?
      (draw-text sketch (str val) (+ x (/ w 2)) (+ y (/ h 2) 6)
                 (get c/COLORS :text) 18 :align :center))))

;; ---- Equipment card ----

(defn draw-equipment-card [sketch equip x y w slots-data selected-slot]
  (draw-rect sketch x y w 70 (get c/COLORS :panel) :radius 8)
  (draw-rect-outline sketch x y w 70 (get c/COLORS :border) 1 :radius 8)
  (draw-glyph sketch (:glyph equip) (+ x 22) (+ y 28) (get c/COLORS :accent) 20)
  (draw-text sketch (:name equip) (+ x 42) (+ y 18) (get c/COLORS :text) 12)
  (draw-text sketch (:desc equip) (+ x 42) (+ y 33) (get c/COLORS :text-dim) 10)
  ;; draw slots
  (let [num-slots (:slots equip)
        slot-w 40]
    (doseq [i (range num-slots)]
      (let [sx (+ x 42 (* i (+ slot-w 6)))
            sy (+ y 44)
            slot-val (get slots-data i)
            filled? (some? slot-val)
            sel? (= selected-slot i)]
        (draw-slot sketch sx sy slot-w 24 filled? slot-val)
        (when sel?
          (draw-rect-outline sketch (- sx 2) (- sy 2) (+ slot-w 4) 28
                             (get c/COLORS :accent) 2 :radius 7))))))

;; ---- Enemy panel ----

(defn draw-enemy [sketch enemy]
  (let [x 450 y 60
        w 320 h 200
        cur-hp (:current-hp enemy)
        max-hp (:max-hp enemy)]
    (draw-rect sketch x y w h (get c/COLORS :panel-alt) :radius 10)
    (draw-rect-outline sketch x y w h (get c/COLORS :border) 1 :radius 10)
    (draw-glyph sketch (:glyph enemy) (+ x 60) (+ y 80) (:color enemy) 52)
    (draw-text sketch (:name enemy) (+ x w 10) (+ y 24)
               (get c/COLORS :text) 13 :align :right)
    ;; HP bar
    (draw-bar sketch (+ x 10) (+ y h -40) (- w 20) 18
              cur-hp max-hp
              (get c/COLORS :health-fg) (get c/COLORS :health-bg) "HP")))

;; ---- Enemy intent ----

(defn draw-intent [sketch intent]
  (when intent
    (let [{:keys [ability dice]} intent
          x 450 y 280 w 320]
      (draw-rect sketch x y w 80 (get c/COLORS :panel) :radius 8)
      (draw-rect-outline sketch x y w 80 (get c/COLORS :border) 1 :radius 8)
      (draw-text sketch "ENEMY INTENT" (+ x 10) (+ y 16)
                 (get c/COLORS :text-dim) 10)
      (draw-text sketch (:name ability) (+ x 10) (+ y 32)
                 (get c/COLORS :danger) 13)
      (let [dmg (:dmg ability)
            eff (:effect ability)]
        (draw-text sketch
                   (cond
                     (and dmg (pos? dmg)) (str "Deal " dmg " damage")
                     (= eff :sanity-drain) (str "Drain " (:amount ability) " sanity")
                     (= eff :skip-turn) "Skip your turn"
                     :else "Unknown")
                   (+ x 10) (+ y 50) (get c/COLORS :text) 12))
      ;; show dice
      (doseq [[i d] (map-indexed vector dice)]
        (draw-die sketch (+ x 10 (* i 34)) (+ y 58) 28 d false false)))))

;; ---- Player info ----

(defn draw-player-info [sketch player]
  (let [x 20 y 20]
    (draw-text sketch "CULTIST" x (+ y 14) (get c/COLORS :accent2) 14)
    (draw-bar sketch x (+ y 22) 180 18
              (:hp player) (:max-hp player)
              (get c/COLORS :health-fg) (get c/COLORS :health-bg) "HP")
    (draw-bar sketch x (+ y 46) 180 18
              (:sanity player) (:max-sanity player)
              (get c/COLORS :sanity-fg) (get c/COLORS :sanity-bg) "SANITY")))

;; ---- Dice tray ----

(defn draw-dice-tray [sketch dice selected-idx]
  (let [x 20 y 380
        label-y (- y 16)]
    (draw-text sketch "YOUR RITUAL FRAGMENTS" x label-y (get c/COLORS :text-dim) 11)
    (doseq [[i val] (map-indexed vector dice)]
      (let [dx (+ x (* i 58))
            used? (= val :used)
            sel? (= i selected-idx)]
        (draw-die sketch dx y 48 val used? sel?)))))

;; ---- Equipment area ----

(defn draw-equipment-area [sketch player slots selected-slot]
  (let [x 20 y 450
        artifacts (:artifacts player)
        spells (:spells player)]
    (draw-text sketch "CURSED ARTIFACTS" x (- y 14) (get c/COLORS :text-dim) 11)
    (doseq [[i equip] (map-indexed vector (concat artifacts spells))]
      (let [ey (+ y (* i 78))
            equip-slots (get slots i {})
            slot-vals (into {} (for [[k v] equip-slots] [k (:val v)]))
            sel-slot (when (= (:equip-idx selected-slot) i) (:slot-idx selected-slot))]
        (draw-equipment-card sketch equip x ey 420 slot-vals sel-slot)))))

;; ---- Action buttons ----

(defn draw-button [sketch x y w h label color hover?]
  (let [bg (if hover? (get c/COLORS :accent) color)]
    (draw-rect sketch x y w h bg :radius 6)
    (draw-text sketch label (+ x (/ w 2)) (+ y (/ h 2) 5)
               (get c/COLORS :text) 13 :align :center)))

(defn draw-action-buttons [sketch rerolls-left hover]
  (let [bx 450 by 380]
    (draw-button sketch bx by 140 36
                 (str "REROLL (" rerolls-left ")")
                 (get c/COLORS :panel)
                 (= hover :reroll))
    (draw-button sketch (+ bx 150) by 140 36
                 "END TURN"
                 (get c/COLORS :danger)
                 (= hover :end-turn))))

;; ---- Title screen ----

(defn draw-title [sketch]
  (let [cx (/ c/CANVAS-W 2)
        cy (/ c/CANVAS-H 2)]
    (.background sketch (get c/COLORS :void))
    ;; decorative circles
    (doseq [i (range 5)]
      (let [r (* (inc i) 55)]
        (.noFill sketch)
        (.stroke sketch (get c/COLORS :border))
        (.strokeWeight sketch 0.5)
        (.ellipse sketch cx cy r r)))
    (.noStroke sketch)
    (draw-glyph sketch "⊜" cx (- cy 50) (get c/COLORS :accent) 60)
    (draw-text sketch "VOID RITES" cx (- cy 10)
               (get c/COLORS :accent2) 42 :align :center)
    (draw-text sketch "A GAME OF ELDRITCH RUIN" cx (+ cy 14)
               (get c/COLORS :text-dim) 14 :align :center)
    (draw-text sketch "click to begin the ritual" cx (+ cy 60)
               (get c/COLORS :accent) 13 :align :center)))

;; ---- Loot screen ----

(defn draw-loot [sketch loot-options hover-idx]
  (.background sketch (get c/COLORS :void))
  (draw-text sketch "CHOOSE AN OFFERING" (/ c/CANVAS-W 2) 60
             (get c/COLORS :accent2) 22 :align :center)
  (draw-text sketch "Select one artifact or spell to carry forward."
             (/ c/CANVAS-W 2) 90 (get c/COLORS :text-dim) 13 :align :center)
  (doseq [[i item] (map-indexed vector loot-options)]
    (let [cx (+ 100 (* i 230))
          cy 200
          w 200 h 240
          hover? (= i hover-idx)]
      (draw-rect sketch cx cy w h
                 (if hover? (get c/COLORS :panel-alt) (get c/COLORS :panel))
                 :radius 12)
      (draw-rect-outline sketch cx cy w h
                         (if hover? (get c/COLORS :accent) (get c/COLORS :border))
                         (if hover? 2 1) :radius 12)
      (draw-glyph sketch (:glyph item) (+ cx 100) (+ cy 70) (get c/COLORS :accent) 38)
      (draw-text sketch (:name item) (+ cx 100) (+ cy 110)
                 (get c/COLORS :text) 14 :align :center)
      (draw-text sketch (:desc item) (+ cx 20) (+ cy 140)
                 (get c/COLORS :text-dim) 11)
      (draw-button sketch (+ cx 40) (+ cy 195) 120 35
                   "TAKE IT" (get c/COLORS :accent) hover?))))

;; ---- Game over screen ----

(defn draw-game-over [sketch cause]
  (.background sketch (get c/COLORS :void))
  (let [cx (/ c/CANVAS-W 2) cy (/ c/CANVAS-H 2)]
    (draw-glyph sketch "⊗" cx (- cy 60) (get c/COLORS :danger) 55)
    (draw-text sketch "YOU HAVE BEEN UNMADE" cx (- cy 10)
               (get c/COLORS :danger) 28 :align :center)
    (draw-text sketch (or cause "The void claimed another cultist.") cx (+ cy 20)
               (get c/COLORS :text-dim) 14 :align :center)
    (draw-button sketch (- cx 80) (+ cy 70) 160 40 "TRY AGAIN"
                 (get c/COLORS :accent) false)))

;; ---- Victory screen ----

(defn draw-victory [sketch]
  (.background sketch (get c/COLORS :void))
  (let [cx (/ c/CANVAS-W 2) cy (/ c/CANVAS-H 2)]
    (draw-glyph sketch "⊛" cx (- cy 60) (get c/COLORS :gold) 55)
    (draw-text sketch "THE SLEEPER STIRS" cx (- cy 10)
               (get c/COLORS :gold) 30 :align :center)
    (draw-text sketch "You have completed the ritual. The void is satisfied... for now."
               cx (+ cy 20) (get c/COLORS :text-dim) 13 :align :center)
    (draw-button sketch (- cx 80) (+ cy 70) 160 40 "PLAY AGAIN"
                 (get c/COLORS :accent) false)))

;; ---- Floating message ----

(defn draw-message [sketch msg timer]
  (when (and msg (pos? timer))
    (let [alpha (min 255 (* timer 4))
          cx (/ c/CANVAS-W 2)]
      (.fill sketch (get c/COLORS :gold))
      (.textSize sketch 16)
      (.textAlign sketch (.-CENTER sketch))
      (.text sketch msg cx 340))))

;; ---- Combat screen (main draw) ----

(defn draw-combat [sketch state]
  (let [combat (:combat state)
        player (:player state)
        enemy (:enemy combat)
        dice (:player-dice combat)
        slots (:player-slots combat)
        rerolls (:rerolls-left combat)
        intent (:enemy-intent combat)
        sel-die (:selected-die state)
        sel-slot (:selected-slot state)
        hover (:hover state)
        msg (:message state)
        msg-t (:msg-timer state)]
    (.background sketch (get c/COLORS :void))
    ;; left panel bg
    (draw-rect sketch 10 10 440 580 (get c/COLORS :deep) :radius 12)
    ;; right panel bg
    (draw-rect sketch 440 10 350 580 (get c/COLORS :deep) :radius 12)
    ;; floor label
    (draw-text sketch (str "FLOOR " (:floor state)) 450 16
               (get c/COLORS :text-dim) 11)
    (draw-player-info sketch player)
    (draw-enemy sketch enemy)
    (draw-intent sketch intent)
    (draw-dice-tray sketch dice sel-die)
    (draw-equipment-area sketch player slots sel-slot)
    (draw-action-buttons sketch rerolls hover)
    (draw-message sketch msg msg-t)))
