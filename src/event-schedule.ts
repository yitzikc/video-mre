import { findIndex } from 'lodash';
const moment = require('moment');

export interface ScheduledEvent {
	startTime: number | string;
}

export class ScheduledEventTimeline {
	private sortedEvents: ScheduledEvent[];

	constructor(events: ScheduledEvent[], private onEventStart: (e: ScheduledEvent) => any) {
		const eventCompare = (a: ScheduledEvent, b: ScheduledEvent) => {
			return this.getStartTimestamp(a) - this.getStartTimestamp(b);
		};
		const normalizeStartTime = (e: ScheduledEvent) => {
			return Object.assign({}, e, { startTime: this.getStartTimestamp(e) });
		};
		this.sortedEvents = events.map(normalizeStartTime).sort(eventCompare);

		const now = Date.now();
		const startIndex: number = findIndex(
			this.sortedEvents,
			(e: ScheduledEvent) => { return this.getStartTimestamp(e) > now; });

		if (startIndex >= 0) {
			setTimeout(() => {
				this.runAndScheduleNext(startIndex)
			}, this.getStartTimestamp(this.sortedEvents[startIndex]) - now);
		}

		// TODO: If all some or all events are overdue log
		return;
	}

	private runAndScheduleNext = (startIdx: number) => {
		try { 
			this.onEventStart(this.sortedEvents[startIdx]);
		}
		finally { 
			if (startIdx + 1 < this.sortedEvents.length) {
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
}
