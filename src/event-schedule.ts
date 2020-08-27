import { findIndex } from 'lodash';
const moment = require('moment');

export interface ScheduledEvent {
	startTime: number | string;
	endTime?: number | string;
}

export type EventState = "start" | "inProgress" | "end" | "past"
export type EventCallback = (state: EventState, event: ScheduledEvent) => any

export class ScheduledEventTimeline {
	private sortedEvents: ScheduledEvent[];

	constructor(events: ScheduledEvent[], private onEvent: EventCallback) {
		const eventCompare = (a: ScheduledEvent, b: ScheduledEvent) => {
			return ScheduledEventTimeline.getStartTimestamp(a) - ScheduledEventTimeline.getStartTimestamp(b);
		};
		const normalizeStartTime = (e: ScheduledEvent) => {
			return Object.assign({}, e, {
				startTime: ScheduledEventTimeline.getStartTimestamp(e),
				userStartTimeSpec: e.startTime,
			});
		};
		this.sortedEvents = events.map(normalizeStartTime).sort(eventCompare);
	}

	public start = (): void => {
		const timeLineStartTime = Date.now();

		const startIndex: number = findIndex(
			this.sortedEvents,
			(e: ScheduledEvent) => {
				return ScheduledEventTimeline.getStartTimestamp(e) > timeLineStartTime;
			});

		if (startIndex >= 0) {
			setTimeout(() => {
				this.runAndScheduleNext(startIndex)
			}, ScheduledEventTimeline.getStartTimestamp(this.sortedEvents[startIndex]) - timeLineStartTime);
			this.notifyPastEvents(this.sortedEvents.slice(0, startIndex));
		}
		else {
			this.notifyPastEvents(this.sortedEvents);
		}

		return;
	}

	private runAndScheduleNext = (startIdx: number) => {
		try { 
			this.onEvent("start", this.sortedEvents[startIdx]);
			const endTime = ScheduledEventTimeline.getEndTimestamp(this.sortedEvents[startIdx]);
			if (endTime) {
				const eventDuration = endTime - ScheduledEventTimeline.getStartTimestamp(this.sortedEvents[startIdx]);
				if (eventDuration > 0) {
					setTimeout(() => {
						this.onEvent("end", this.sortedEvents[startIdx]);
					}, eventDuration);
				}
				// TODO: Log an warning if not
			}
		}
		finally { 
			if (startIdx + 1 < this.sortedEvents.length) {
				// TODO: Always have timeout≥0, so multiple events scheduled at the same time will run immediately.
				setTimeout(() =>{ 
					this.runAndScheduleNext(startIdx + 1)
				}, ScheduledEventTimeline.getStartTimestamp(this.sortedEvents[startIdx + 1]) - Date.now())
			}
		}
	}

	private static parseTimestamp = (ts: number | string, baselineTime?: number): number => {
		if (typeof ts === "number") {
			return ts;
		}
		else if (ts[0] === "+") {
			const baselineMoment = (baselineTime === undefined) ? moment() : moment(baselineTime);
			return baselineMoment.add(ts.slice(1), "LTS").valueOf();
		}
		else {
			return moment(ts, moment.ISO_8601).valueOf();
		}
	}

	private static getStartTimestamp = (e: ScheduledEvent): number => {
		return ScheduledEventTimeline.parseTimestamp(e.startTime);
	}

	private static getEndTimestamp = (e: ScheduledEvent): number | undefined => {
		if (! e.endTime) {
			return undefined;
		}
		const startTime = ScheduledEventTimeline.getStartTimestamp(e)
		return ScheduledEventTimeline.parseTimestamp(e.endTime, startTime)
	}

	private notifyPastEvents = (events: ScheduledEvent[]) => {
		if (events.length === 0) {
			return;
		}

		let numEventsInProgress = 0;

		// FIXME: Catch and log exceptions
		
		events.slice(-1).forEach(event => {
			// TODO: Detect cases where multiple events whose start time
			// has passed are still in progress.
			const lastMissedEndTime = ScheduledEventTimeline.getEndTimestamp(event)
			if (! lastMissedEndTime || (lastMissedEndTime > Date.now())) {
				numEventsInProgress++;
			}
		});

		events.slice(0, events.length - numEventsInProgress).forEach((e: ScheduledEvent) => { 
			this.onEvent("past", e);
		});

		events.slice(events.length - numEventsInProgress).forEach((e: ScheduledEvent) => { 
			this.onEvent("inProgress", e);
		});

		return;
	}
}
