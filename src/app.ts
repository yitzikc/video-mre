/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable linebreak-style */
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import fetch from 'node-fetch'; 
import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { ScheduledMediaPlayer, ScheduledMedia } from './scheduled-media-player';
import { getParameterLastValue } from './parameter-set-util';
import { log } from '@microsoft/mixed-reality-extension-sdk';

export interface MediaSchedule {
	mediaSchedule: ScheduledMedia[]
}

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
	private curve: MRE.Actor = null;
	private video: MRE.VideoStream = null;	// Remove
	private assets: MRE.AssetContainer;
	private mediaScheduleUrl: string;
	private timeLine: ScheduledMediaPlayer;

	constructor(private context: MRE.Context, private params: MRE.ParameterSet, private baseUrl: string) {
		log.enable("app", "info");
		this.context.onStarted(() => this.started());
		this.context.onUserJoined((user: MRE.User) => {
			log.info("app", "User joined session %s: %s", context.sessionId, JSON.stringify(user.toJSON()));
		});
		this.context.onUserLeft((user: MRE.User) => {
			log.info("app", "User left session %s: %s", context.sessionId, JSON.stringify(user.toJSON()));
		});
		this.assets = new MRE.AssetContainer(this.context);
		this.timeLine = new ScheduledMediaPlayer(this.assets, []);
		this.mediaScheduleUrl = getParameterLastValue(params, "ms");
		log.info("Initializing session %s from JSON schedule %s", context.sessionId, this.mediaScheduleUrl);
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private async started() {
		// eslint-disable-next-line max-len
		// See https://github.com/microsoft/mixed-reality-extension-sdk/blob/master/packages/functional-tests/src/tests/livestream-test.ts

		this.curve = MRE.Actor.CreatePrimitive(this.assets, {
			definition: { shape: MRE.PrimitiveShape.Box, dimensions: { z:1 } }
		});

		const mediaSchedule = await this.loadMediaSchedule();
		this.timeLine = new ScheduledMediaPlayer(this.assets, mediaSchedule.mediaSchedule);
		this.timeLine.start(this.curve);
	}

	private async loadMediaSchedule() {
		const schedule = await fetch(this.mediaScheduleUrl).then((res) => {
			if (! res.ok) {
				throw Error(`Request to fetch JSON config failed with status ${res.status}`);
			}
			return res.json() as Promise<MediaSchedule>;
		});
		
		return schedule;
	}
}
