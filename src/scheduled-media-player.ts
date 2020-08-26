/* eslint-disable no-mixed-spaces-and-tabs */
// A video player which which plays on a schedule
import {
	SetMediaStateOptions, VideoStreamLike, AssetContainer, Actor, log
} from '@microsoft/mixed-reality-extension-sdk';

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
    	log.info("app", "Called handler with state", state, JSON.stringify(event));
    	switch (state) {
    		case "start":
    			this.startPlay(event);
    			break;
    		case "end":
    			log.info("app", "Stopping video playback");
    			this.playingVideo.stop();
    			break;
    		default:
    			break;

    	}
    }

    private startPlay = (args: ScheduledMedia) => {

    	// FIXME: This should be guaranteed at the type definition level.
    	if (! args.uri) {
    		console.log("app", "Skipping play since URI is missing", args.uri);
    		return;
    	}

    	console.log("app", "Starting to play", args.uri, "for/until", args.endTime);
    	// TODO: Look up URIs in the assets collection before creating.
    	const video = this.mediaAssets.createVideoStream(args.uri, { uri: args.uri });
    	console.log("Created video", video.id, "from URL", args.uri);
    	this.playingVideo.stop()
    	this.playingVideo = new PlayingMedia(
    		this.playingActor!.startVideoStream(video.id, args), args);
    };
}
