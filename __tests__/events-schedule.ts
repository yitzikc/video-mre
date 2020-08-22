import { advanceBy, advanceTo } from 'jest-date-mock';
import { ScheduledEventTimeline } from '../src/event-schedule';

jest.useFakeTimers("legacy");

test("empty event schedule", () => {
    const callback = jest.fn();
    let es = new ScheduledEventTimeline([], callback);
    jest.runAllTimers();
    expect(callback).not.toBeCalled();
} );

test("All events passed", () => { 
    const callback = jest.fn();
    const events = [
        { startTime: 100000000 },
        { startTime: 300000000 },
        { startTime: "1990-10-11T10:11:12Z"},
        { startTime: "1995-10-11T11:11:30+02"},
        { startTime: 990000000 }
    ];
    let es = new ScheduledEventTimeline(events, callback);
    jest.runAllTimers();
    expect(callback).not.toBeCalled();
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
    jest.advanceTimersByTime(hour - second);
    expect(callback).not.toBeCalled();

    // Simulate getting called 5 seconds later than scheduled.
    advanceTo(Date.UTC(2020, 7, 20, 10, 0, 5));
    jest.advanceTimersByTime(6 * second);
    expect(callback).toBeCalled();
    expect(callback).toHaveBeenCalledTimes(1);

    advanceBy(hour - 66 * second);
    jest.advanceTimersByTime(hour - 66 * second);
    expect(callback).toHaveBeenCalledTimes(1);

    // This time we're called just a second later than scheduled.
    advanceTo(Date.UTC(2020, 7, 20, 11, 0, 1));
    jest.advanceTimersByTime(62 * second);
    expect(callback).toHaveBeenCalledTimes(2);

    // Called just on time
    advanceTo(Date.UTC(2020, 7, 20, 14, 0, 0));
    jest.advanceTimersByTime(3 * hour - 1 * second);
    expect(callback).toHaveBeenCalledTimes(3);

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
    expect(callback).not.toBeCalled();
    advanceBy(0.5 * hour);
    jest.advanceTimersByTime(0.5 * hour);
    expect(callback).toBeCalled();
    expect(callback).toHaveBeenCalledTimes(1);

    advanceBy(3 * hour);
    jest.advanceTimersByTime(3 * hour);
    expect(callback).toHaveBeenCalledTimes(2);

    jest.runAllTimers();
    expect(callback).toHaveBeenCalledTimes(2);
    return;
})
