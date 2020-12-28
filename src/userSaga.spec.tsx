import {
  call,
  put,
  take,
  delay,
  debounce,
  takeLatest,
} from "redux-saga/effects";
import { expectSaga } from "redux-saga-test-plan";
import { channel } from "polyrhythm";

let DELAY = 5000;

function* userSaga(api) {
  const action = yield take("REQUEST_USER");
  const user = yield call(api.fetchUser, action.payload);

  yield put({ type: "RECEIVE_USER", payload: user });
}

function* userSagaDebounced(api) {
  yield debounce(100, "REQUEST_USER", function* (action) {
    const user = yield call(api.fetchUser, action.payload);
    yield put({ type: "RECEIVE_USER", payload: user });
  });

  // Use this to delay but not debounce (test should fail)
  // yield delay(100);
  // yield put({ type: "RECEIVE_USER", payload: mockUser });

  // Desugars debounce
  // yield takeLatest("REQUEST_USER", function* (action) {
  //   yield delay(100);
  //   const user = yield call(api.fetchUser, action.payload);
  //   yield put({ type: "RECEIVE_USER", payload: user });
  // });
}

const mockUser = { id: 42, name: "Joe" };
const mockApiSync = {
  fetchUser() {
    return mockUser;
  },
};

const mockApiAsync = {
  fetchUser() {
    return Promise.resolve(mockUser);
  },
};

describe("Synchronous Lookup", () => {
  it("maps REQUEST_USER to RECIEVE_USER", () => {
    return (
      expectSaga(userSaga, mockApiSync)
        // Assert that the `put` will eventually happen.
        .put({
          type: "RECEIVE_USER",
          payload: mockUser,
        })
        // Dispatch any actions that the saga will `take`.
        .dispatch({ type: "REQUEST_USER" })
        // Start the test. Returns a Promise.
        .run()
    );
  });
});

describe("Async-Lookup With Delay", () => {
  it("maps REQUEST_USER to RECIEVE_USER", () => {
    return (
      expectSaga(userSaga, mockApiAsync)
        // Assert that the `put` will eventually happen.
        .put({
          type: "RECEIVE_USER",
          payload: mockUser,
        })
        // Dispatch any actions that the saga will `take`.
        .dispatch({ type: "REQUEST_USER" })
        // Start the test. Returns a Promise.
        .run()
    );
  });
});

describe("Debounced", () => {
  it("maps multiple REQUEST_USER to RECEIVE_USER", () => {
    /*
    Debounce testing is awkward/broken with Redux Saga Test Plan
    can't even seem to assert on the complete list of put actions,
    just individually.
    */
    return (
      expectSaga(userSagaDebounced, mockApiAsync)
        // Assert that the `put` will eventually happen.
        // Dispatch any actions that the saga will `take`.
        .dispatch({ type: "REQUEST_USER", id: 42 })
        .delay(1)
        .dispatch({ type: "REQUEST_USER", id: 43 })
        // Start the test. Returns a Promise.
        .run()
        .then(result => {
          // LEFTOFF assert only one RECEIVE_USER
          expect(result.effects.put.map(x => x.payload.action)).toEqual([
            {
              type: "RECEIVE_USER",
              payload: mockUser,
            },
          ]);
        })
    );
  });
});
