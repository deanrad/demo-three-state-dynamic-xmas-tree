import { after, map, microflush } from "polyrhythm";
import { concat, from, of, interval } from "rxjs";
import { fakeSchedulers } from "rxjs-marbles/jest";

import { delay, put } from "redux-saga/effects";
import { expectSaga, testSaga } from "redux-saga-test-plan";

const CYCLE_TIME = 2000;
const SET_COLOR = "color/set";

const blinkerSaga = function* () {
  while (true) {
    yield put({ type: SET_COLOR, payload: "white" });
    yield delay(CYCLE_TIME);
    yield put({ type: SET_COLOR, payload: "off" });
    yield delay(CYCLE_TIME);
  }
};

/* Would you even need to test this? */
const COLOR_BEHAVIORS = {
  test: "test", // A value
  off: Promise.resolve("off"), // An awaitable microtask to deliver a value
  white: after(CYCLE_TIME, "white"), // Observable: await delay(); next('rainbow'); complete();
  rainbow: of("rainbow"), // Observable: next('rainbow'); complete();
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
      it("Turns off after the Promise queue is flushed", async () => {});
    });

    describe("White", () => {
      it(`Turns white after ${CYCLE_TIME}`, () => {
        let seen;
        const subs = COLOR_BEHAVIORS.white.subscribe(v => (seen = v));
        expect(seen).toEqual("white");
        expect(subs).toHaveProperty("closed", true);
      });
    });

    describe("Rainbow", () => {
      it(`Turns rainbow immediately`, () => {});
    });

    describe("Alternating", () => {
      // Synchronous: Yes
      // Depth: Unit - asserts only the effects, not the effects of the effects
      // Deps: Redux-saga for effects, redux-saga-test-plan for assertions
      // Time Expression: refied. Replacing the full delay with 2 half-delays would break.
      //  You're working with a reification of time, not actual/virtual time.
      it("Tests a blinker saga with testSaga", () => {
        // prettier-ignore
        testSaga(blinkerSaga)
          .next()
          .put({ type: SET_COLOR, payload: "white" })
          .next()
          .delay(CYCLE_TIME)
          .next()
          .put({ type: SET_COLOR, payload: "off" })
          .next()
          .delay(CYCLE_TIME)
      });
      it.todo(
        "Tests a blinker saga with expectSaga (impossible unless can saga time be faked?)"
      );

      // Synchronous: Yesq
      // Depth: Unit+Observables - it does 'call through' the RxJS stack
      // Deps: RxJS for library and fake time code. (Uses Jest for useFakeTimers() ).
      // Time Expression: RxJS uses the same scheuduler abstraction for system, virtual
      // and other variations on time.
      it(
        `Cycles white/rainbow every ${CYCLE_TIME}`,
        fakeSchedulers(advance => {
          let seen;
          let cc = 0;
          const subs = COLOR_BEHAVIORS.alternating.subscribe(v => {
            seen = v;
            cc += 1;
          });
          expect(seen).toEqual("white");
          advance(CYCLE_TIME);
          expect(seen).toEqual("rainbow");

          // Note advance is O(1) constant time to advance into the arbitrary future
          // while saga iteration with testSaga is O(t) where t is how far you go.
          advance(3999 * CYCLE_TIME);
          expect(seen).toEqual("white");
          expect(subs).toHaveProperty("closed", false);
          expect(cc).toEqual(4001);
        })
      );
    });
  });
});
