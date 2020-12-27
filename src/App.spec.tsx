import { after, map, microflush } from "polyrhythm";
import { concat, from, of, interval } from "rxjs";
import { fakeSchedulers } from "rxjs-marbles/jest";

const CYCLE_TIME = 2000;
const COLORS = {
  off: Promise.resolve("off"), // Interchangable with the following
  white: after(CYCLE_TIME, "white"), // convenient delay
  rainbow: of("rainbow"), // next('rainbow'); complete();
  alternating: concat(
    after(0, "white"),
    interval(CYCLE_TIME).pipe(map(i => (i % 2 ? "white" : "rainbow")))
  ),
};

describe("App", () => {
  beforeEach(() => jest.useFakeTimers());

  describe("Mode Changes", () => {
    it.todo("advances the mode");
  });

  describe("Color Behaviors", () => {
    describe("Off", () => {
      it("Turns off after the Promise queue is flushed", async () => {
        let seen;
        const subs = from(COLORS.off).subscribe(v => (seen = v));
        await microflush();
        expect(seen).toEqual("off");
        expect(subs).toHaveProperty("closed", true);
      });
    });

    describe("White", () => {
      it(
        `Turns white after ${CYCLE_TIME}`,
        fakeSchedulers(advance => {
          let seen;
          const subs = COLORS.white.subscribe(v => (seen = v));
          advance(CYCLE_TIME);
          expect(seen).toEqual("white");
          expect(subs).toHaveProperty("closed", true);
        })
      );
    });

    describe("Rainbow", () => {
      it(`Turns rainbow immediately`, () => {
        let seen;
        const subs = COLORS.rainbow.subscribe(v => (seen = v));
        expect(seen).toEqual("rainbow");
        expect(subs).toHaveProperty("closed", true);
      });
    });

    describe("Alternating", () => {
      it(
        `Cycles white/rainbow every ${CYCLE_TIME}`,
        fakeSchedulers(advance => {
          let seen;
          const subs = COLORS.alternating.subscribe(v => (seen = v));
          expect(seen).toEqual("white");
          advance(CYCLE_TIME);
          expect(seen).toEqual("rainbow");
          advance(3999 * CYCLE_TIME);
          expect(seen).toEqual("white");
          expect(subs).toHaveProperty("closed", false);
        })
      );
    });
  });
});
