/* eslint-disable no-mixed-spaces-and-tabs */
// A video player which which plays on a schedule
const assert = require('assert').strict;
import { URL } from 'url';

import {
	SetMediaStateOptions,
	VideoStreamLike,
	VideoStream,
	AssetContainer,
	Actor,
	Guid,
	log
} from '@microsoft/mixed-reality-extension-sdk';
import getVideoDuration from 'get-video-duration';
import fetch from 'node-fetch'; 

import { PlayingMedia } from './playing-media';
import { ScheduledEventTimeline, ScheduledEvent, EventState } from './event-schedule';

export type ScheduledMedia = ScheduledEvent & SetMediaStateOptions & Partial<VideoStreamLike>;

export class ScheduledMediaPlayer {
	// A map of playing actor GUID to playing media object
	private playingVideo: Map<Guid, PlayingMedia>;
	private playingScreens: Map<Guid, Actor>;
	private scheduledEvents?: ScheduledEventTimeline
	private currentActiveVideo: VideoStream = null;
	private currentActiveParameters: ScheduledMedia = null;

	constructor(private mediaAssets: AssetContainer, private mediaSchedule: ScheduledMedia[]) {   
    	this.playingVideo = new Map<Guid, PlayingMedia>();
    	this.playingScreens = new Map<Guid, Actor>(); 
	}

	// Set the actor used for playing, and start the timeline
	public start(): void {
    	//this.playingActor = playingActor;
    	this.scheduledEvents = new ScheduledEventTimeline(this.mediaSchedule, this.handleScheduleEvent);
    	this.scheduledEvents.start();
    	this.checkScheduledMedia(this.mediaSchedule).then(() => {
    		log.info("app", "Finished checking scheduled media");
    	}).catch((error) => {
    		log.error("app", "Failed to check scheduled media", error);
    	})
	}

	public addScreen = (screen: Actor): void => {
		this.playingScreens.set(screen.id, screen);
		if (this.currentActiveVideo && this.currentActiveParameters) {
			const adjustedArgs = this.adjustArgsForStartTime(this.currentActiveVideo, this.currentActiveParameters);
			if (adjustedArgs) {
				this.startPlayingForActor(screen, adjustedArgs);
			}
		}
	}

	public removeScreen = (screen: Actor): void => {
		this.playingVideo.get(screen.id)?.stop();
		this.playingVideo.delete(screen.id);
		this.playingScreens.delete(screen.id);
	}

    protected handleScheduleEvent = (state: EventState, event: ScheduledEvent) : void => {
    	log.info("app", "Called handler with state %s: %s", state, JSON.stringify(event));
    	switch (state) {
    		case "start":
			case "inProgress":
    			this.startPlay(event);
    			break;
    		case "end":
    			this.stopPlay();
    			break;
    		default:
    			break;

    	}
    }

	private stopPlay = () => {
		this.playingVideo.forEach(pv => {
    		pv.stop();
		})
		this.currentActiveVideo = null;
		this.currentActiveParameters = null;
	}

    private startPlay = (args: ScheduledMedia) => {

    	// FIXME: This should be guaranteed at the type definition level.
    	if (! args.uri) {
    		log.warning("app", "Skipping play since URI is missing", args.uri);
    		return;
    	}

    	log.info("app", "Starting to play", args.uri, "for/until", args.endTime);

		this.stopPlay();
		let video = this.mediaAssets.createVideoStream(args.uri, { uri: args.uri });
		this.startPlayingVideo(video, args);
    }

    private async adjustDurationFromMedia(video: VideoStream) {
    	if ((video.duration > 0) || !video.uri){
    		return;
    	}

    	// If streaming, no point to try to estimate the duration.
    	if (video.uri.includes(".m3u8")) {
    		return;
    	}

		// FIXME: Parse the URL properly and look at the path compoment
    	if (video.uri.includes(".webm") || video.uri.includes(".mp4")) {
    		await getVideoDuration(video.uri).then(
    			(duration) => {
    				log.info("app", "Detected the duration of %s as %f seconds", video.uri, duration);
    				video.copy({ videoStream: { duration: duration } });
    			}
    		).catch(
    			(reason) => {
    				log.warning("Failed to get duration of %s: %s", video.uri, JSON.stringify(reason));
    			}
    		);
    	}
    }

	private startPlayingVideo = (video: VideoStream, args: ScheduledMedia) => {
		const videoInfo = `video ${video.id.toString()} from URI ${video.uri}`;
    	video.created.then(
    		() => {
				this.adjustDurationFromMedia(video).then(() => {
					log.info("app", "Successfully created %s with duration %f", videoInfo, video.duration);
					const adjustedArgs = this.adjustArgsForStartTime(video, args);
					if (adjustedArgs) {
						this.currentActiveVideo = video;
						this.currentActiveParameters = args;
						this.playingScreens.forEach(
							actor => this.startPlayingForActor(actor, adjustedArgs));
					}
				});
    		},
    		(reason: any) => {
    			log.error("app", "Failed to create %s: %s", videoInfo, JSON.stringify(reason));
    		}
    	);
	}

	private adjustArgsForStartTime = (video: VideoStream, args: ScheduledMedia): ScheduledMedia => {
		let adjustedArgs = Object.assign({}, args);
		if (! args.looping) {
			const delayFromScheduledStart = (Date.now() - <number> args.startTime) / 1000;
			Object.assign(adjustedArgs, {time: (args.time || 0) + delayFromScheduledStart});
			if (video.duration && (adjustedArgs.time > video.duration)) {
				log.info("app", "Skipping playback of video with delay %d > duration %d",
					adjustedArgs.time, video.duration);
				return null;
			}
		}

		return adjustedArgs;
	}

	private startPlayingForActor = (
		actor: Actor, adjustedArgs: ScheduledMedia
	) => {
		const playingMedia = new PlayingMedia(
			actor.startVideoStream(this.currentActiveVideo.id, adjustedArgs), adjustedArgs);
		this.playingVideo.set(actor.id, playingMedia);
	}

	private async checkScheduledMedia(schedule: ScheduledMedia[]) {
		const eventsWithNormalizedUrls = schedule.map(event =>
			Object.assign({}, event, { uri: ScheduledMediaPlayer.normalizeMediaUrl(event.uri) })
		);

		for (const event of eventsWithNormalizedUrls) {
			const actualUrl = await ScheduledMediaPlayer.resolveHttpRedirects(event.uri).catch(
				(error) => {
					log.error("app", "Failed to perform check on URL %s: %s", event.uri, error);
				});
			if (actualUrl) {
				log.info("app", "Verified access to media for event at %s. URL: %s",
					event.startTime, actualUrl);
			}
			// If we didn't get a valid URL, resolveHttpRedirects would have logged a warning
		}
	}

	private static normalizeMediaUrl(url: string) {
		const parsedUrl = new URL(url);
		switch (parsedUrl.protocol.toLowerCase()) {
			case "https:":
			case "http:":
				return url;

			case "youtube:":
				return `https://www.youtube.com/watch?v=${parsedUrl.hostname}`;

			default:
				throw new Error(`Unrecognized URL scheme ${parsedUrl.protocol}: ${url}`);
		}

	}

	private static async resolveHttpRedirects (url: string): Promise<string> {
		const actualUrl = await fetch(url, {
			method: 'HEAD',
			redirect: "follow"
		}).then(
			(rsp) => {
				if (!rsp.ok) {
					log.warning("app", "Request for the URL %s failed with status %d",
						url, rsp.status);
					return null;
				}
				if (rsp.url !== url) {
					log.info("app", "URL redirect %s -> %s", url, rsp.url);
				}
				return rsp.url;
			}, (reason) => {
				log.warning("app", "Request for the URL %s failed", JSON.stringify(reason));
			}
		);
		return actualUrl || null;
	}
}
