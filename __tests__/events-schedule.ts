import { ScheduledEvent, ScheduledEventTimeline } from '../src/event-schedule';
jest.useFakeTimers();

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
