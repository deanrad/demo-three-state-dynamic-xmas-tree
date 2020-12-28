import { channel, after, Event } from "polyrhythm";
import { Observable, of, Subscription, concat } from "rxjs";
import { fakeSchedulers } from "rxjs-marbles/jest";

const mockUser = { id: 42, name: "Joe" };
const mockApi = {
  fetchUser() {
    return Promise.resolve(mockUser);
  },
};

const api = mockApi;

describe("User Rhythm", () => {
  let cleanup: Subscription;
  let DELAY = 5000;
  let channelSeenEvents: Event[];

  beforeEach(() => {
    jest.useFakeTimers();
    cleanup = new Subscription();
    channelSeenEvents = new Array<Event>();
    cleanup.add(channel.filter(true, e => channelSeenEvents.push(e)));
  });

  beforeEach(() => {
    channel.listen("REQUEST_USER", () => mockUser, {
      trigger: { next: "RECEIVE_USER" },
    });

    channel.listen("REQUEST_USER_DELAY", () => after(DELAY, mockUser), {
      trigger: { next: "RECEIVE_USER" },
    });

    channel.listen("REQUEST_USER_DEBOUNCED", () => after(DELAY, mockUser), {
      trigger: { next: "RECEIVE_USER" },
      mode: "replace",
    });
  });

  afterEach(() => {
    // run any unsubscribers - tests should do cleanup.add for cleanup
    cleanup.unsubscribe();
    // and simply
    channel.reset();
  });

  describe("Synchronous lookup", () => {
    it("maps REQUEST_USER to RECEIVE_USER", () => {
      // declare inputs
      const request = { type: "REQUEST_USER" };
      const input = of(request);

      // run the inputs
      input.subscribe(e => channel.trigger(e));

      // assert the outputs
      expect(channelSeenEvents).toEqual([
        request,
        {
          type: "RECEIVE_USER",
          payload: mockUser,
        },
      ]);
    });
  });

  describe("Async-Lookup With Delay", () => {
    it(
      "maps REQUEST_USER_DELAY to RECEIVE_USER",
      fakeSchedulers(advance => {
        // declare inputs
        const request = { type: "REQUEST_USER_DELAY" };
        const input = of(request);

        // run the inputs
        input.subscribe(e => channel.trigger(e));

        // advance time virtually
        advance(DELAY);

        // assert the outputs
        expect(channelSeenEvents).toEqual([
          request,
          {
            type: "RECEIVE_USER",
            payload: mockUser,
          },
        ]);
      })
    );
  });

  describe("Debounced calls", () => {
    it(
      "maps multiple immediate REQUEST_USER to single RECEIVE_USER",
      fakeSchedulers(advance => {
        // declare inputs
        const request = { type: "REQUEST_USER_DEBOUNCED" };
        const input = of(request, request);

        // run the inputs
        input.subscribe(e => channel.trigger(e));

        // advance time virtually, with sufficient margin
        advance(DELAY * 10);

        // assert the outputs - 2 requests, one output
        expect(channelSeenEvents).toEqual([
          request,
          request,
          {
            type: "RECEIVE_USER",
            payload: mockUser,
          },
        ]);
      })
    );

    it(
      "maps multiple async REQUEST_USER to RECEIVE_USER",
      fakeSchedulers(advance => {
        // declare inputs
        const request = { type: "REQUEST_USER_DEBOUNCED" };
        const input = concat(after(0, request), after(DELAY * 0.5, request));

        // run the inputs
        input.subscribe(e => channel.trigger(e));

        // advance time virtually, with sufficient margin
        advance(DELAY * 10);

        // assert the outputs - 2 requests, one output
        expect(channelSeenEvents).toEqual([
          request,
          request,
          {
            type: "RECEIVE_USER",
            payload: mockUser,
          },
        ]);
      })
    );
  });
});
