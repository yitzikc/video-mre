import { findIndex } from 'lodash';

export interface ScheduledEvent {
	startTime: number;
}

export class ScheduledEventTimeline {
	private sortedEvents: ScheduledEvent[];

	constructor(events: ScheduledEvent[], private onEventStart: (e: ScheduledEvent) => any) {
		const eventCompare = (a: ScheduledEvent, b: ScheduledEvent) => { return b.startTime - a.startTime; };
		this.sortedEvents = events.sort(eventCompare);

		const now = Date.now();
		const startIndex: number = findIndex(
			this.sortedEvents,
			(e: ScheduledEvent) => { return e.startTime > now; });

		if (startIndex >= 0) {
			setTimeout(() => {
				this.runAndScheduleNext(startIndex)
			}, this.sortedEvents[startIndex].startTime - now);
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
				}, this.sortedEvents[startIdx + 1].startTime - Date.now())
			}
		}
	}
}
