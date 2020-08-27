import { advanceBy, advanceTo } from 'jest-date-mock';
import { ScheduledEventTimeline } from '../src/event-schedule';

jest.useFakeTimers("legacy");

test("empty event schedule", () => {
    const callback = jest.fn();
    let es = new ScheduledEventTimeline([], callback);
    es.start();
    jest.runAllTimers();
    expect(callback).not.toBeCalled();
} );

test("All events passed", () => { 
    const callback = jest.fn();
    const events = [
        { startTime: 100000000 },
        { startTime: 300000000 },
        { startTime: "1990-10-11T10:11:12Z", endTime: "+10:00"},
        { startTime: "1990-10-11T11:11:30+02"},
        { startTime: 990000000 }
    ];
    let es = new ScheduledEventTimeline(events, callback);
    es.start();
    jest.runAllTimers();
    expect(callback).toHaveBeenCalledTimes(events.length);

    // The expected timestamps of the events, Note that
    // 1990-10-11T11:11:30+02 comes before 1990-10-11T10:11:12Z
    const expectedStartTimes = [
        100000000,
        300000000,
        990000000,
        Date.UTC(1990, 9, 11, 9, 11, 30),
        Date.UTC(1990, 9, 11, 10, 11, 12)
    ];
    callback.mock.calls.forEach( (args, i) => {
        expect(args[0]).toEqual("past");
        console.log(args[1].startTime, args[1].userStartTimeSpec);
        expect(args[1].startTime).toEqual(expectedStartTimes[i]);
    } );
})

test("All events still due", () => {
    const callback = jest.fn();
    advanceTo(Date.UTC(2020, 7, 20, 9, 0, 0));
    const events = [
        { startTime: "2020-08-20T10:00:00Z" },
        { startTime: "2020-08-20T14:00:00Z" },
        { startTime: "2020-08-20T11:00:00Z" },
    ];

    const second = 1000;
    const hour = 60 * 60 * second;

    let es = new ScheduledEventTimeline(events, callback);
    es.start();
    jest.advanceTimersByTime(hour - second);
    expect(callback).not.toBeCalled();

    // Simulate getting called 5 seconds later than scheduled.
    advanceTo(Date.UTC(2020, 7, 20, 10, 0, 5));
    jest.advanceTimersByTime(6 * second);
    expect(callback).toBeCalled();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toEqual("start");
    expect(callback.mock.calls[0][1].startTime).toEqual(Date.now() - 5000);

    advanceBy(hour - 66 * second);
    jest.advanceTimersByTime(hour - 66 * second);
    expect(callback).toHaveBeenCalledTimes(1);

    // This time we're called just a second later than scheduled.
    advanceTo(Date.UTC(2020, 7, 20, 11, 0, 1));
    jest.advanceTimersByTime(62 * second);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[1][0]).toEqual("start");
    expect(callback.mock.calls[1][1].startTime).toEqual(Date.now() - 1000);

    // Called just on time
    advanceTo(Date.UTC(2020, 7, 20, 14, 0, 0));
    jest.advanceTimersByTime(3 * hour - 1 * second);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback.mock.calls[2][0]).toEqual("start");
    expect(callback.mock.calls[2][1].startTime).toEqual(Date.now());

    jest.runAllTimers();
    expect(callback).toHaveBeenCalledTimes(3);
    return;
})

test("Some events passed", () => {
    const callback = jest.fn();
    advanceTo(Date.UTC(2020, 7, 20, 10, 30, 0));

    const events = [
        { startTime: "2020-08-20T10:00:00Z" },
        { startTime: "2020-08-20T14:00:00Z" },
        { startTime: "2020-08-19T23:00:00Z" },
        { startTime: "2020-08-20T11:00:00Z" },
    ];

    const second = 1000;
    const hour = 60 * 60 * second;

    let es = new ScheduledEventTimeline(events, callback);

    // Ensure no callbacks are made before we call start
    jest.runAllTimers();
    expect(callback).not.toBeCalled();

    es.start();
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[0][0]).toEqual("past");
    expect(callback.mock.calls[0][1].startTime).toEqual(Date.UTC(2020, 7, 19, 23, 0, 0));
    expect(callback.mock.calls[1][0]).toEqual("inProgress");
    expect(callback.mock.calls[1][1].startTime).toEqual(Date.now() - hour / 2);

    advanceBy(0.5 * hour);
    jest.advanceTimersByTime(0.5 * hour);
    expect(callback).toBeCalled();
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback.mock.calls[2][0]).toEqual("start");
    expect(callback.mock.calls[2][1].startTime).toEqual(Date.now());

    advanceBy(3 * hour);
    jest.advanceTimersByTime(3 * hour);
    expect(callback).toHaveBeenCalledTimes(4);
    expect(callback.mock.calls[3][0]).toEqual("start");
    expect(callback.mock.calls[3][1].startTime).toEqual(Date.now());

    jest.runAllTimers();
    expect(callback).toHaveBeenCalledTimes(4);
    return;
})

test("Event Start End", () => {
    const callback = jest.fn();
    advanceTo(Date.UTC(2020, 7, 20, 10, 30, 0));

    const events = [
        { startTime: "2020-08-20T10:00:00Z" },
        { startTime: "2020-08-20T14:00:00Z", endTime: null },
        { startTime: "2020-08-19T23:00:00Z", endTime: "2020-08-20T01:00:00Z" },
        { startTime: "2020-08-20T11:00:00Z", endTime: "2020-08-20T12:30:00Z" },
    ];

    const second = 1000;
    const hour = 60 * 60 * second;

    let es = new ScheduledEventTimeline(events, callback);
    es.start();
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[0][0]).toEqual("past");
    expect(callback.mock.calls[0][1].startTime).toEqual(Date.UTC(2020, 7, 19, 23, 0, 0));
    expect(callback.mock.calls[1][0]).toEqual("inProgress");
    expect(callback.mock.calls[1][1].startTime).toEqual(Date.now() - hour / 2);

    advanceBy(0.5 * hour + 30 * second);
    jest.advanceTimersByTime(0.5 * hour + 10 * second);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback.mock.calls[2][0]).toEqual("start");
    expect(callback.mock.calls[2][1].startTime).toEqual(Date.now() - 30 * second);

    // Make sure the event duration wasn't affected by starting 30 seconds later than scheduled.
    advanceBy(1.5 * hour - 30 * second);
    jest.advanceTimersByTime(1.5 * hour - 30 * second);
    expect(callback).toHaveBeenCalledTimes(3);
    advanceBy(30 * second);
    jest.advanceTimersByTime(30 * second);
    expect(callback).toHaveBeenCalledTimes(4);
    expect(callback.mock.calls[3][0]).toEqual("end");
    expect(callback.mock.calls[3][1].endTime).toEqual("2020-08-20T12:30:00Z");

    // Ensure the next event starts on time
    advanceBy(1.5 * hour - 30 * second);
    jest.advanceTimersByTime(1.5 * hour - 30 * second);
    expect(callback).toHaveBeenCalledTimes(5);
    expect(callback.mock.calls[4][0]).toEqual("start");
    expect(callback.mock.calls[4][1].startTime).toEqual(Date.now());

    // Ensure that setting the end time to null suppresses the 'end' event
    jest.runAllTimers();
    expect(callback).toHaveBeenCalledTimes(5);
    return;
});

test("Timestamp parsing and sorting", () => {
    const callback = jest.fn();
    advanceTo(Date.UTC(2020, 7, 20, 10, 30, 0));

    const events = [
        { startTime: "2020-08-20T12:00:00Z" },
        { startTime: "+00:30:00", endTime: "+00:45:00" },
        { startTime: "2020-08-20T19:00:00+01" },
        { startTime: "2020-08-20T09:00:00-04", endTime: "+02:30" },
    ];

    const second = 1000;
    const hour = 60 * 60 * second;
    let es = new ScheduledEventTimeline(events, callback);
    es.start();

    advanceBy(0.5 * hour);
    jest.advanceTimersByTime(0.5 * hour);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toEqual("start");
    expect(callback.mock.calls[0][1].userStartTimeSpec).toEqual("+00:30:00");
    expect(callback.mock.calls[0][1].endTime).toEqual("+00:45:00");
    expect(callback.mock.calls[0][1].startTime).toEqual(Date.now());
    advanceBy(0.75 * hour);
    jest.advanceTimersByTime(0.75 * hour);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[1][0]).toEqual("end");
    expect(callback.mock.calls[1][1].endTime).toEqual("+00:45:00");
    expect(callback.mock.calls[1][1]).toEqual(callback.mock.calls[0][1]);

    advanceBy(0.25 * hour);
    jest.advanceTimersByTime(0.25 * hour);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback.mock.calls[2][1].userStartTimeSpec).toEqual("2020-08-20T12:00:00Z");
    expect(callback.mock.calls[2][1].startTime).toEqual(Date.now());
    expect(callback.mock.calls[2][0]).toEqual("start");

    advanceBy(hour);
    jest.advanceTimersByTime(hour);
    expect(callback).toHaveBeenCalledTimes(4);
    expect(callback.mock.calls[3][1].userStartTimeSpec).toEqual("2020-08-20T09:00:00-04");
    expect(callback.mock.calls[3][1].startTime).toEqual(Date.now());
    expect(callback.mock.calls[3][0]).toEqual("start");
    advanceBy(2.5 * hour);
    jest.advanceTimersByTime(2.5 * hour);
    expect(callback).toHaveBeenCalledTimes(5);
    expect(callback.mock.calls[4][0]).toEqual("end");
    expect(callback.mock.calls[4][1].endTime).toEqual("+02:30");
    expect(callback.mock.calls[4][1]).toEqual(callback.mock.calls[3][1]);

    advanceBy(2.5 * hour);
    jest.advanceTimersByTime(2.5 * hour);
    expect(callback).toHaveBeenCalledTimes(6);
    expect(callback.mock.calls[5][1].userStartTimeSpec).toEqual("2020-08-20T19:00:00+01");
    expect(callback.mock.calls[5][1].startTime).toEqual(Date.now());
    expect(callback.mock.calls[5][0]).toEqual("start");
    return;
});
