/* eslint-disable no-mixed-spaces-and-tabs */
// A video player which which plays on a schedule
const assert = require('assert').strict;

import {
	SetMediaStateOptions,
	VideoStreamLike,
	VideoStream,
	AssetContainer,
	Actor,
	log
} from '@microsoft/mixed-reality-extension-sdk';
import getVideoDuration from 'get-video-duration';

import { PlayingMedia } from './playing-media';
import { ScheduledEventTimeline, ScheduledEvent, EventState } from './event-schedule';

export type ScheduledMedia = ScheduledEvent & SetMediaStateOptions & Partial<VideoStreamLike>;

export class ScheduledMediaPlayer {
    private playingVideo: PlayingMedia;
    private scheduledEvents?: ScheduledEventTimeline
    private playingActor?: Actor = null;

    constructor(private mediaAssets: AssetContainer, private mediaSchedule: ScheduledMedia[]) {        
    	this.playingVideo = new PlayingMedia();       
    }

    // Set the actor used for playing, and start the timeline
    public start(playingActor: Actor): void {
    	this.playingActor = playingActor;
    	this.scheduledEvents = new ScheduledEventTimeline(this.mediaSchedule, this.handleScheduleEvent);
    	this.scheduledEvents.start();
    }

    protected handleScheduleEvent = (state: EventState, event: ScheduledEvent) : void => {
    	log.info("app", "Called handler with state %s: %s", state, JSON.stringify(event));
    	switch (state) {
    		case "start":
    			this.startPlay(event);
    			break;
    		case "end":
    			this.playingVideo.stop();
    			break;
    		case "inProgress":
    			this.startBelatedPlay(event);
    			break;
    		default:
    			break;

    	}
    }

    private startPlay = (args: ScheduledMedia) => {

    	// FIXME: This should be guaranteed at the type definition level.
    	if (! args.uri) {
    		log.warning("app", "Skipping play since URI is missing", args.uri);
    		return;
    	}

    	log.info("app", "Starting to play", args.uri, "for/until", args.endTime);
		// TODO: Look up URIs in the assets collection before creating.
    	this.playingVideo.stop()

    	this.capVideoStartTime(args).then(
    		(cappedArgs: ScheduledMedia) => {
    			if (! cappedArgs.time || (cappedArgs.time === args.time)) {
    				if (cappedArgs.time !== args.time) {
    					log.info("app", "Start time for %s has been capped to %d", cappedArgs.uri, cappedArgs.time)
    				}
    				const video = this.mediaAssets.createVideoStream(args.uri, { uri: args.uri });
    				this.playingVideo = new PlayingMedia(
						this.playingActor!.startVideoStream(video.id, args), cappedArgs);
    				return this.confirmVideoCreation(video);
    			}
    			else {
    				log.info("app", "Skipping playback of video with delay %d > duration %d",
    					args.time, cappedArgs.time);
    			}
    		},
    		(reason) => {
    			log.error("app", "Failed to start video %s: %s", args.uri, JSON.stringify(reason));
    		});
    }

	private confirmVideoCreation = (video: VideoStream) => {
		const videoInfo = `video ${video.id} from URI ${video.uri}`;
    	video.created.then(
    		() => {
    			log.info("app", "Successfully created %s with duration %f", videoInfo, video.duration);
    		},
    		(reason: any) => {
    			log.error("app", "Failed to create %s: %s", videoInfo, JSON.stringify(reason));
    		}
    	);
	}

	private startBelatedPlay = (args: ScheduledMedia) => {
		const intendedStartTime = +(args?.time || 0);
		assert.equal(typeof args.startTime, "number");
		const startDelay = args.looping ? 0 : (Date.now() - <number> args.startTime) / 1000;
		log.info("app", "Starting playback at intended %d with %d seconds delay: %s",
			intendedStartTime, startDelay, JSON.stringify(args));

		const scheduleAdjustedMedia = Object.assign({}, args, { time: intendedStartTime + startDelay });
		return this.startPlay(scheduleAdjustedMedia);
	}

	private async capVideoStartTime(args: ScheduledMedia): Promise<ScheduledMedia> {
		const specifiedTime = args.time;
		if (! specifiedTime) {
			return args;
		}

		let maxDuration = Number.MAX_VALUE;
		if (args.uri.includes(".m3u8")) {
			maxDuration = 0;
		}
		else if (args.uri.includes(".webm") || args.uri.includes(".mp4")) {
			maxDuration = await getVideoDuration(args.uri).catch(
				(reason) => {
					log.warning("Failed to get duration of %s: %s", args.uri, JSON.stringify(reason));
					return maxDuration;
				}
			);
		}
		return Object.assign({}, args, { time: Math.min(args.time, maxDuration) });
	}
}
