import {
  after,
  useListener,
  trigger,
  log,
  useEffectAtMount
} from "polyrhythm-react";
import React, { useState } from "react";
import { concat, of, interval } from "rxjs";
import { map } from "rxjs/operators";
import "./styles.css";

const TRANSITIONS = {
  off: "white",
  white: "rainbow",
  rainbow: "alternating",
  alternating: "off"
};

const CYCLE_TIME = 2000;
const COLORS = {
  off: Promise.resolve("off"), // Interchangable with the following
  white: after(2000, "white"), // convenient delay
  rainbow: of("rainbow"), // next('rainbow'); complete();
  alternating: concat(
    after(0, "white"),
    interval(CYCLE_TIME).pipe(map((i) => (i % 2 ? "white" : "rainbow")))
  )
};

const ADVANCE_MODE = "mode/advance";
const SET_COLOR = "color/set";

export default function App() {
  const [{ mode, color }, setState] = useState({
    mode: "off",
    color: "off"
  });
  const setAtts = (atts) => setState((old) => ({ ...old, ...atts }));

  // log every event
  useListener(true, log);

  useListener(ADVANCE_MODE, ({ payload: { from } }) => {
    const newMode = TRANSITIONS[from];
    setAtts({ mode: newMode });
  });
  useListener(SET_COLOR, ({ payload: color }) => setAtts({ color }));

  // Look - Closes over no React state, or state changer functions!
  useListener(
    ADVANCE_MODE,
    ({ payload: { from } }) => {
      const newMode = TRANSITIONS[from];
      const colorBehavior = COLORS[newMode];
      return colorBehavior;
    },
    {
      // Events of the returned Observable get triggered as data
      // here in actions of the specified type
      trigger: { next: SET_COLOR },
      // The previous Observable is unsubscribed, and this one takes
      // its place, ala Switchmap
      // https://camo.githubusercontent.com/63a705ab8b15276a4f9138e4079af29fd3eeec9a3a0b8d50779b2a4438ed90fe/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f7777772e6465616e6975732e636f6d2f436f6e6375724d6f646573322e706e67
      mode: "replace"
    }
  );

  useEffectAtMount(() => {
    trigger(ADVANCE_MODE, { from: "white" });
  });

  return (
    <div className="App">
      <button id="switch" onClick={() => trigger(ADVANCE_MODE, { from: mode })}>
        Switch!
      </button>
      <div className="tree">
        <div className={`top light red ${color}`} />
        <div className="bottom">
          <div className={`bl light green ${color}`} />
          <div className={`br light blue ${color}`} />
        </div>
      </div>
      <div id="atts">
        <b>Mode: </b>
        {mode}
        &nbsp;
        <b>Color: </b>
        {color}
      </div>
    </div>
  );
}
