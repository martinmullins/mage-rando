(ns void-rites.constants)

(def CANVAS-W 800)
(def CANVAS-H 600)

;; Color palette - clean vector flat, eldritch horror
(def COLORS
  {:void       "#0a0a0f"
   :deep       "#12121e"
   :panel      "#1a1a2e"
   :panel-alt  "#16213e"
   :border     "#2d2d5e"
   :accent     "#7c3aed"   ;; violet
   :accent2    "#a855f7"   ;; light violet
   :danger     "#dc2626"   ;; blood red
   :warning    "#d97706"   ;; amber
   :success    "#059669"   ;; teal
   :gold       "#f59e0b"
   :text       "#e5e7eb"
   :text-dim   "#6b7280"
   :text-muted "#374151"
   :die-bg     "#1e1e3f"
   :die-border "#7c3aed"
   :die-used   "#2d1f4f"
   :slot-empty "#1f2937"
   :slot-full  "#312e81"
   :health-fg  "#dc2626"
   :health-bg  "#1f1515"
   :sanity-fg  "#7c3aed"
   :sanity-bg  "#150d20"})

;; Eldritch enemy definitions
(def ENEMIES
  [{:id :herald
    :name "The Herald of Gnawing Voids"
    :hp 20 :max-hp 20
    :dice-count 2
    :abilities [{:name "Entropy Bite" :slots [3] :dmg 5}
                {:name "Unravel" :slots [5 6] :dmg 0 :effect :sanity-drain :amount 2}]
    :glyph "◈" :color "#6d28d9" :tier 1}
   {:id :watcher
    :name "The Watcher Between Seconds"
    :hp 30 :max-hp 30
    :dice-count 3
    :abilities [{:name "Temporal Gnash" :slots [4 5] :dmg 8}
                {:name "Erase Moment" :slots [6] :dmg 0 :effect :skip-turn}]
    :glyph "⊗" :color "#9333ea" :tier 1}
   {:id :choir
    :name "Choir of Unmaking"
    :hp 45 :max-hp 45
    :dice-count 3
    :abilities [{:name "Cacophony" :slots [2 3] :dmg 6}
                {:name "Soul Fracture" :slots [5] :dmg 10}
                {:name "Consume Thought" :slots [6] :dmg 0 :effect :sanity-drain :amount 4}]
    :glyph "⊛" :color "#7e22ce" :tier 2}
   {:id :sleeper
    :name "The Sleeper Beneath All Things"
    :hp 80 :max-hp 80
    :dice-count 4
    :abilities [{:name "Dream Crush" :slots [4] :dmg 15}
                {:name "Void Surge" :slots [5 6] :dmg 20}
                {:name "Ancient Hunger" :slots [3 4 5] :dmg 0 :effect :sanity-drain :amount 6}]
    :glyph "⊜" :color "#4c1d95" :tier 3 :boss true}])

;; Equipment / artifact defs (loot pool)
(def ARTIFACTS
  [{:id :bloodied-lens
    :name "Bloodied Lens"
    :desc "When you roll a 6, gain +2 damage this turn."
    :slots 1
    :glyph "◉"
    :slot-type :any
    :passive {:trigger :roll-6 :effect :bonus-dmg :amount 2}}
   {:id :shattered-idol
    :name "Shattered Idol"
    :desc "Slot a 4-6 to deal 7 damage."
    :slots 1
    :glyph "◆"
    :slot-type :high
    :active {:required [#{4 5 6}] :effect :damage :amount 7}}
   {:id :ritual-dagger
    :name "Ritual Dagger"
    :desc "Slot any die to deal its face value as damage."
    :slots 1
    :glyph "◇"
    :slot-type :any
    :active {:required [:any] :effect :damage-by-value}}
   {:id :void-compass
    :name "Void Compass"
    :desc "Slot a 1 to reroll all unslotted dice."
    :slots 1
    :glyph "⊕"
    :slot-type :low
    :active {:required [#{1}] :effect :reroll-unslotted}}
   {:id :cursed-tome
    :name "Cursed Tome"
    :desc "Slot two matching dice to deal 12 damage."
    :slots 2
    :glyph "⊞"
    :slot-type :pair
    :active {:required [:pair] :effect :damage :amount 12}}
   {:id :entropy-sigil
    :name "Entropy Sigil"
    :desc "Slot a 3 to heal 3 HP."
    :slots 1
    :glyph "⊟"
    :slot-type :any
    :active {:required [#{3}] :effect :heal :amount 3}}
   {:id :void-crown
    :name "Void Crown"
    :desc "Slot any die. Each turn, +1 to all rolls."
    :slots 1
    :glyph "⊠"
    :slot-type :any
    :passive {:trigger :turn-start :effect :bonus-roll :amount 1}
    :active {:required [:any] :effect :damage-by-value}}
   {:id :obsidian-eye
    :name "Obsidian Eye"
    :desc "Slot 1+2 (or 2+1) to look at enemy intent."
    :slots 2
    :glyph "◈"
    :slot-type :sequence
    :active {:required [:sequence-low] :effect :reveal-intent}}])

;; Forbidden spells (second equipment category)
(def SPELLS
  [{:id :flaying-word
    :name "Flaying Word"
    :desc "Slot a 5 or 6 to deal 10 damage."
    :slots 1
    :glyph "⟁"
    :active {:required [#{5 6}] :effect :damage :amount 10}}
   {:id :mind-splinter
    :name "Mind Splinter"
    :desc "Slot any odd die to drain 3 sanity from enemy."
    :slots 1
    :glyph "⟃"
    :active {:required [:odd] :effect :enemy-sanity-drain :amount 3}}
   {:id :rift-step
    :name "Rift Step"
    :desc "Slot a 2 to skip enemy's next attack."
    :slots 1
    :glyph "⟂"
    :active {:required [#{2}] :effect :enemy-skip}}
   {:id :blood-tithe
    :name "Blood Tithe"
    :desc "Slot three dice of same value to deal 25 damage."
    :slots 3
    :glyph "⟇"
    :active {:required [:triple] :effect :damage :amount 25}}])

;; Floor/encounter definitions
(def FLOORS
  [{:id 1 :name "The Whispering Crypts" :enemies [:herald :watcher] :loot-count 2}
   {:id 2 :name "The Drowned Cathedral" :enemies [:watcher :choir] :loot-count 2}
   {:id 3 :name "The Void Between Stars" :enemies [:sleeper] :loot-count 3}])
