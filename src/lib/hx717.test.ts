import assert from "node:assert/strict";
import test from "node:test";
import { adsHeaderCheck, frontById, printerSnippet } from "./frontends.ts";
import { hx717ConfigLines, hx717GainChannel, hx717GainName, hx717RestTicks, isHxErrorSample } from "./hx717.ts";

test("HX717 gain channels match Klipper", () => {
  assert.equal(hx717GainChannel(128), 1);
  assert.equal(hx717GainChannel(64), 3);
  assert.equal(hx717GainName(128), "A-128");
  assert.equal(hx717GainName(64), "A-64");
  assert.throws(() => hx717GainChannel(32));
});

test("HX717 config lines name the alpha and H36 pins", () => {
  const alpha = hx717ConfigLines({ dout: "PC2", sclk: "PC1" }, 128);
  assert.deepEqual(alpha, ["allocate_oids count=1", "config_hx71x oid=0 gain_channel=1 dout_pin=PC2 sclk_pin=PC1"]);
  const h36 = hx717ConfigLines({ dout: "PA15", sclk: "PB7" }, 64);
  assert.equal(h36[1], "config_hx71x oid=0 gain_channel=3 dout_pin=PA15 sclk_pin=PB7");
});

test("HX717 rest ticks follow the same 10x poll as the ADS1220", () => {
  assert.equal(hx717RestTicks(48_000_000, 320), Math.trunc(48_000_000 / 3200));
  assert.throws(() => hx717RestTicks(48_000_000, 330));
});

test("desync and long-read samples are not weights", () => {
  assert.equal(isHxErrorSample(-2147483648), true);
  assert.equal(isHxErrorSample(1073741824), true);
  assert.equal(isHxErrorSample(1200), false);
});

test("printer snippets name the right MCU pins", () => {
  const shared = { gain: 128, sampleRate: 320, vref: "analog_supply" as const, countsPerGram: null, tareCounts: null };
  const alpha = printerSnippet({ ...shared, front: frontById("alpha-hx717") });
  assert.match(alpha, /sensor_type: hx717/);
  assert.match(alpha, /sclk_pin: plimsoll:PC1/);
  assert.match(alpha, /dout_pin: plimsoll:PC2/);
  assert.match(alpha, /gain: A-128/);
  const h36 = printerSnippet({ ...shared, gain: 64, front: frontById("h36-hx717") });
  assert.match(h36, /sclk_pin: toolhead:PB7/);
  assert.match(h36, /dout_pin: toolhead:PA15/);
  assert.match(h36, /gain: A-64/);
  const ads = printerSnippet({
    ...shared,
    gain: 64,
    sampleRate: 330,
    vref: "internal",
    cellName: "My column cell",
    front: frontById("h36-ads1220"),
  });
  assert.match(ads, /\[load_cell my_column_cell\]/);
  assert.match(ads, /sensor_type: ads1220/);
  assert.match(ads, /cs_pin: toolhead:PA14/);
  assert.match(ads, /spi_software_sclk_pin: toolhead:PB7/);
  assert.match(ads, /spi_software_mosi_pin: toolhead:PA13/);
  assert.match(ads, /spi_software_miso_pin: toolhead:PA15/);
  assert.match(ads, /data_ready_pin: toolhead:PA1/);
  assert.doesNotMatch(ads, /spi_bus:/);
  assert.doesNotMatch(ads, /hx717/);
  const v1 = printerSnippet({ ...shared, gain: 64, sampleRate: 330, vref: "internal", front: frontById("h36v1-ads1220") });
  assert.match(v1, /cs_pin: toolhead:PB6/);
  assert.match(v1, /data_ready_pin: toolhead:PC13/);
  assert.match(v1, /spi_bus: spi1a/);
  assert.doesNotMatch(v1, /spi_software_/);
  assert.equal(
    adsHeaderCheck(frontById("h36v1-ads1220")),
    "CS PB6, SCLK PB3, MOSI PB5, MISO PB4, and DRDY PC13 (spi1a)",
  );
  const v1hx = printerSnippet({ ...shared, front: frontById("h36v1-hx717") });
  assert.match(v1hx, /sclk_pin: toolhead:PB3/);
  assert.match(v1hx, /dout_pin: toolhead:PB4/);
  assert.match(v1hx, /stm32g0b1xx/);
});
