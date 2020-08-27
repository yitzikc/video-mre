/* eslint-disable no-mixed-spaces-and-tabs */
// A video player which which plays on a schedule
import {
	SetMediaStateOptions, VideoStreamLike, AssetContainer, Actor, log
} from '@microsoft/mixed-reality-extension-sdk';
import fetch from 'node-fetch'; 

import { PlayingMedia } from './playing-media';
import { ScheduledEventTimeline, ScheduledEvent, EventState } from './event-schedule';

export type ScheduledMedia = ScheduledEvent & SetMediaStateOptions & Partial<VideoStreamLike>;

export class ScheduledMediaPlayer {
    private playingVideo: PlayingMedia;
    private scheduledEvents?: ScheduledEventTimeline
    private playingActor?: Actor = null;
	private MediaAccessCheckTimer?: NodeJS.Timeout = null;

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
    	const videoInfo = `video ${video.id} from URI ${args.uri}`
    	video.created.then(
    		() => {
    			log.info("app", "Successfully created %s", videoInfo);
    			this.MediaAccessCheckTimer = setInterval((): void => {
    				const urlToMonitor = (
    					"http://ec2-18-133-161-211.eu-west-2.compute.amazonaws.com/hls/stream1/index.m3u8");
    				fetch(urlToMonitor, { method: "HEAD"}).then(
    					(res) => {
    						if (! res.ok) {
    							log.error("app", "Failed check for URL %s", urlToMonitor);
    						}
    						else {
    							log.info("app", "Res OK!")
    						}
    					},
    					(reason) => {
    						log.error("app", "Fetch error %s: %s", urlToMonitor, JSON.stringify(reason));
    					}
    				)
    			}, 5000);
    		},
    		(reason: any) => {
    			log.error("app", "Failed to create %s: %s", videoInfo, JSON.stringify(reason));
    		}
    	);
    };
}
