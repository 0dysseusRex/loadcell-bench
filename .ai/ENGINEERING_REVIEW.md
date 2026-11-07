# Engineering Review: Mechanical Requirements R-M01 through R-M08

**Date:** 2026-11-06  
**Reviewer:** Engineering Assistant  
**Subject:** Mechanical design, thermal behavior, manufacturability, reliability, and structural architecture for custom K2 load cell bench.  
**Requirement IDs Covered:** R-M01, R-M02, R-M03, R-M04, R-M05, R-M06, R-M07, R-M08  

---

## 1. Executive Summary

This engineering review evaluates the mechanical, thermal, manufacturing, and structural reliability aspects of the dual-guided parallel-beam custom K2 load cell (R-M01 through R-M08). The architecture uses an aluminum 6061-T6 substrate plate (38 × 24 × 2.54 mm) with four milled/laser-cut flexure necks (1.6 mm initial width × 8.0 mm length), instrumented with four 1000 Ω BA1000-3AA foil strain gauges wired in a full Wheatstone bridge. A custom single/double-sided flex PCB with nine localized polyimide/FR4 stiffener zones provides interconnects without mechanically shunting the compliant flexures.

All physical dimensions, elastic stiffness calculations, yield margins, adhesive/coating selections, flex PCB routing topology, and assembly steps were cross-referenced against `src/lib/model.ts`, `src/lib/dxf.test.ts`, `wiki/hardware/custom-k2-loadcell/build.md`, `wiki/hardware/custom-k2-loadcell/flex-pcb.md`, `hardware/flex-bridge/fab/jlcpcb/ORDER.txt`, and `hardware/flex-bridge/flex-bridge.kicad_pcb`.

The design is physically sound, manufacturable with hobbyist/prototyping shop tools (or low-cost commercial laser/waterjet cutting), and satisfies all functional deflection, sensitivity, and structural safety requirements.

---

## 2. Assumptions

- **A-01 (Substrate Material):** Aluminum 6061-T6 sheet stock with nominal thickness 2.54 mm (0.100 in), Young's modulus $E = 68.9\text{ GPa}$, Poisson's ratio $\nu = 0.33$, and yield strength $\sigma_y = 276\text{ MPa}$.
- **A-02 (Boundary Conditions):** Fixed-guided parallel beam flexure. The fixed end (24 mm edge) is rigidly clamped to the test stand base; the load end is deflected vertically with negligible rotational slope at the free clamp.
- **A-03 (Strain Transmission):** Cyanoacrylate (Loctite 401) bondline thickness is $< 15\ \mu\text{m}$, providing $> 99.5\%$ strain transfer efficiency from substrate surface to foil grid.
- **A-04 (Thermal Environment):** Laboratory bench operating environment of $20^\circ\text{C} \pm 10^\circ\text{C}$. Bridge self-heating is negligible with $1000\ \Omega$ gauges driven at $\le 3.3\text{ V}$.

---

## 3. Mechanical Review

- **R-M01 (Plate Dimensions & Material):**
  - Specified: 6061-T6 plate, 38 mm length × 24 mm width × 2.54 mm thickness. DXF bounding box (0,0) to (38,24).
  - Verification: Confirmed in `src/lib/model.ts` (`CELL.plateLengthMm = 38`, `CELL.plateWidthMm = 24`, `CELL.plateThicknessMm = 2.54`) and unit test `src/lib/dxf.test.ts` which asserts extents `min = (0, 0)` and `max = (38, 24)`. 2.54 mm corresponds to standard 0.100" imperial sheet stock readily available with tight thickness tolerance (±0.05 mm).
  - Assessment: **PASS**.

- **R-M02 (Flexure Necks Geometry & Edge Preparation):**
  - Specified: Four flexure necks starting at 1.6 mm width × 8.0 mm length; deburring requirement prior to bonding.
  - Verification: `model.ts` defaults to `defaultNeckWidthMm = 1.6` and `defaultNeckLengthMm = 8.0`. With two necks per stage (four total in the dual-guided parallelogram structure), bending strain concentration is localized across the 8 mm span. Build documentation (`wiki/.../build.md`) mandates edge deburring and light corner radiusing with 600-grit silicon carbide paper to prevent notch-induced stress concentrations and foil backing tears.
  - Assessment: **PASS**.

- **R-M04 (Bridge Geometry & Placement):**
  - Specified: Full Wheatstone bridge arrangement with gauges aligned with the principal bending strain along the neck longitudinal axis.
  - Verification: Gauges A and C sit on one face (top) experiencing tension/compression under load; gauges B and D sit on the opposed face (bottom) experiencing complementary strains. This provides $4\times$ bending strain sensitivity ($(\Delta V / V_{ex}) = G_F \cdot \epsilon$) while mechanically canceling common-mode axial loads ($F_x$) and thermal expansion strains. `model.ts` records `gaugeMount: 'opposed-face'`, and `build.md` documents routing of B/D via neck through-holes.
  - Assessment: **PASS**.

- **R-M05 (Stiffness & Yield Margin):**
  - Specified: Bending stiffness $\sim 1439\text{ kg/mm}$, yield ceiling near 48 kg; rated capacity configurable by operator.
  - Verification & Stress Calculation:
    - For four rectangular beams of width $b = 1.6\text{ mm}$, height $h = 2.54\text{ mm}$, length $L = 8.0\text{ mm}$:
      $$I_{single} = \frac{b h^3}{12} = \frac{1.6 \times 2.54^3}{12} \approx 2.185\text{ mm}^4$$
      $$I_{total} = 4 \times I_{single} = 8.74\text{ mm}^4$$
    - In guided cantilever bending with zero tip slope, individual neck stiffness is $k_{neck} = \frac{12 E I}{L^3}$. Across four necks:
      $$K = \frac{12 \times 68.9 \times 10^3\text{ N/mm}^2 \times 8.74\text{ mm}^4}{8.0^3\text{ mm}^3} \approx 14,103\text{ N/mm} \approx 1438\text{ kgf/mm}$$
      This confirms the modeled value of $1439\text{ kg/mm}$ in `src/lib/model.ts`.
    - Peak bending stress at yield $\sigma_y = 276\text{ MPa}$:
      $$M_{total} = \frac{F \cdot L}{2}$$
      $$\sigma_{max} = \frac{M \cdot (h/2)}{I_{total}} = \frac{F \cdot L \cdot h}{4 I_{total}}$$
      $$F_{yield} = \frac{4 \sigma_y I_{total}}{L \cdot h} = \frac{4 \times 276\text{ N/mm}^2 \times 8.74\text{ mm}^4}{8.0\text{ mm} \times 2.54\text{ mm}} \approx 475\text{ N} \approx 48.4\text{ kgf}$$
    - Under a nominal working capacity of 5 kg to 10 kg, safety factor against yield is between $4.8$ and $9.6$. At 10 kg load (98.1 N), maximum surface strain is:
      $$\epsilon = \frac{\sigma}{E} = \frac{57\text{ MPa}}{68.9\text{ GPa}} \approx 827\ \mu\epsilon$$
      yielding an ideal full-bridge output of:
      $$\frac{\Delta V}{V_{ex}} = G_F \cdot \epsilon \approx 2.0 \times 827 \times 10^{-6} \approx 1.65\text{ mV/V}$$
      This fits the input dynamic range of low-noise 24-bit ADCs (HX711 / ADS1232 / NAU7802).
  - Assessment: **PASS**.

---

## 4. Thermal Review

- **R-M03 & R-M04 (Thermal Dissipation & Gradient Sensitivity):**
  - Foil specification: BA1000-3AA has $1000\ \Omega$ nominal resistance (high impedance compared to standard $120\ \Omega$ or $350\ \Omega$ cells).
  - Power dissipation per gauge at $3.3\text{ V}$ bridge excitation:
    $$P_{gauge} = \frac{(V_{ex}/2)^2}{R} = \frac{(1.65\text{ V})^2}{1000\ \Omega} \approx 2.72\text{ mW}$$
    Total bridge power is only $10.9\text{ mW}$.
  - Heat flux density over active grid ($3.0 \times 5.3\text{ mm} = 15.9\text{ mm}^2$):
    $$q'' = \frac{2.72\text{ mW}}{15.9\text{ mm}^2} \approx 0.17\text{ mW/mm}^2$$
    This is well below the conservative $0.5\text{ mW/mm}^2$ limit for aluminum substrates, ensuring virtually zero self-heating drift.
  - The opposed-face full-bridge topology (R-M04) provides intrinsic first-order cancellation of apparent strain caused by uniform temperature swings ($\alpha_{Al} \approx 23\times 10^{-6}/\text{K}$).
  - Assessment: **PASS**.

---

## 5. Manufacturing & Assembly Review

- **R-M03 (Adhesive, Protective Coating & Cure Cycle):**
  - Gauge: BA1000-3AA ($1000\ \Omega$, Gauge Factor $\sim 2.0$, grid size $3.0 \times 5.3\text{ mm}$).
  - Adhesive: Loctite 401 cyanoacrylate. Fast fixture under thumb pressure with Teflon release film; requires 24-hour room temperature stabilization before mechanical calibration to eliminate zero-point creep.
  - Coating: Loctite Hysol 9460 (or equal thixotropic polyurethane/epoxy) applied over gauge grid and solder tabs to seal against humidity and provide mechanical strain relief for lead wires.
  - Assessment: **PASS**.

- **R-M06 & R-M08 (Flex PCB Stiffeners & Mechanical Decoupling):**
  - Specified: Stiffener under gauge solder pads plus one bar under wire exit pads (9 distinct stiffener regions total). Open-top U-shaped outline (two outer vertical arms + bottom interconnect bar).
  - Verification: Confirmed in `wiki/hardware/custom-k2-loadcell/flex-pcb.md`, `hardware/flex-bridge/fab/jlcpcb/ORDER.txt`, and `hardware/flex-bridge/flex-bridge.kicad_pcb`. The flex PCB outline is open at the top so that the flexing displacement of the cantilever load beam does not stretch or shear the copper/polyimide substrate. The 9 discrete stiffener zones ensure solder joints remain rigid while the intervening unreinforced flex spans absorb microscopic beam deflections without adding parasitic mechanical stiffness.
  - Manufacturing note verified in JLCPCB fab instructions: "Nine stiffener zones on rear side (PI/FR4)".
  - Assessment: **PASS**.

- **R-M07 (Opposed Face Wiring & Through-Hole Routing):**
  - Specified: Gauges A/C bonded on top face and soldered directly to flex PCB pads. Gauges B/D bonded on bottom face with 30 AWG magnet wire routed through neck clearance cutouts to flex PCB pads on top.
  - Verification: Clearances in the DXF cutout ($2.0\text{ mm}$ minimum gap) provide ample clearance for enamelled 30 AWG wire ($0.25\text{ mm}$ OD). Epoxy dot anchoring at hole exits prevents wire fatigue during cyclic bending.
  - Assessment: **PASS**.

---

## 6. Reliability & Durability

- **Fatigue Life:** At 10 kg cyclic loading, peak flexural stress is $57\text{ MPa}$, which is $\sim 21\%$ of yield strength ($276\text{ MPa}$) and well below the endurance limit of 6061-T6 ($\sim 95\text{ MPa}$ at $5 \times 10^8$ cycles). Fatigue life exceeds $10^7$ cycles under rated load.
- **Creep & Hysteresis:** Loctite 401 cyanoacrylate forms an extremely thin glueline ($<15\ \mu\text{m}$) which minimizes viscoelastic creep. 24-hour room temperature cure is essential to achieve $<0.05\%$ FS creep.
- **Moisture Protection:** Hysol 9460 encapsulation provides high dielectric isolation ($>10^9\ \Omega$) and protects foil grid against atmospheric oxidation.

---

## 7. Risks and Mitigations

1. **Risk:** Manual edge deburring of 1.6 mm necks (R-M02) may produce uneven neck widths, leading to asymmetric stress distribution.  
   *Mitigation:* Use optical inspection or digital caliper gauging post-deburring. Neck width tolerance of $\pm 0.05\text{ mm}$ is achievable with light dressing.
2. **Risk:** 30 AWG enamel wire shorting against aluminum cutout edges during dynamic flexure (R-M07).  
   *Mitigation:* Apply an insulating dot of silicone or Hysol 9460 where wires pass through the plate cutout.
3. **Risk:** Solder heat damaging polyimide flex or debonding strain gauge solder tabs (R-M03, R-M06).  
   *Mitigation:* Use temperature-controlled iron at $300^\circ\text{C}$ with fine conical tip; solder dwell time $< 2$ seconds per pad.

---

## 8. Recommendations

1. Ensure the plate fabrication drawing explicitly specifies deburring all cut edges to remove laser dross or waterjet abrasive burrs before gauge application.
2. Maintain strict adherence to the 24-hour cure period for Loctite 401 before tare calibration or linearity testing.
3. Secure the 30 AWG routing loops with an extra drop of protective coating to prevent rubbing against the internal plate cutouts.

---

## 9. Approval

Approval: APPROVE
