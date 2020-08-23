import { findIndex } from 'lodash';
const moment = require('moment');

export interface ScheduledEvent {
	startTime: number | string;
}

type EventState = "start" | "inProgress" | "end" | "past"
type EventCallback = (state: EventState, event: ScheduledEvent) => any

export class ScheduledEventTimeline {
	private sortedEvents: ScheduledEvent[];
	private timeLineStartTime: number

	constructor(events: ScheduledEvent[], private onEvent: EventCallback) {
		const eventCompare = (a: ScheduledEvent, b: ScheduledEvent) => {
			return this.getStartTimestamp(a) - this.getStartTimestamp(b);
		};
		const normalizeStartTime = (e: ScheduledEvent) => {
			return Object.assign({}, e, {
				startTime: this.getStartTimestamp(e),
				userStartTimeSpec: e.startTime,
			});
		};
		this.sortedEvents = events.map(normalizeStartTime).sort(eventCompare);
		this.timeLineStartTime = Date.now();

		const startIndex: number = findIndex(
			this.sortedEvents,
			(e: ScheduledEvent) => { return this.getStartTimestamp(e) > this.timeLineStartTime; });

		let pastEvents = this.sortedEvents.slice(0, 0)
		if (startIndex >= 0) {
			setTimeout(() => {
				this.runAndScheduleNext(startIndex)
			}, this.getStartTimestamp(this.sortedEvents[startIndex]) - this.timeLineStartTime);
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
		}
		finally { 
			if (startIdx + 1 < this.sortedEvents.length) {
				// TODO: Always have timeout≥0, so multiple events scheduled at the same time will run immediately.
				setTimeout(() =>{ 
					this.runAndScheduleNext(startIdx + 1)
				}, this.getStartTimestamp(this.sortedEvents[startIdx + 1]) - Date.now())
			}
		}
	}

	private getStartTimestamp = (e: ScheduledEvent): number => {
		if (typeof e.startTime === "number") {
			return e.startTime;
		}
		else {
			return moment(e.startTime, moment.ISO_8601).valueOf();
		}
	}

	private notifyPastEvents = (events: ScheduledEvent[]) => {
		// FIXME: Catch and log exceptions
		events.forEach((e: ScheduledEvent) => { 
			this.onEvent("past", e);
		})
	}
}
