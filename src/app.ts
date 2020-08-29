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
const assert = require('assert').strict;

export interface MediaSchedule {
	mediaSchedule: ScheduledMedia[]
}

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
	private assets: MRE.AssetContainer;
	private mediaScheduleUrl: string;
	private timeLine: ScheduledMediaPlayer;

	constructor(private context: MRE.Context, private params: MRE.ParameterSet, private baseUrl: string) {
		log.enable("app", "info");
		this.context.onStarted(() => this.started());
		this.context.onUserJoined(this.onUserJoined);
		this.context.onUserLeft(this.onUserLeft);
		this.assets = new MRE.AssetContainer(this.context);
		this.timeLine = null;
		this.mediaScheduleUrl = getParameterLastValue(params, "ms");
		log.info("Initializing session %s from JSON schedule %s", context.sessionId, this.mediaScheduleUrl);
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private async started() {
		// eslint-disable-next-line max-len
		// See https://github.com/microsoft/mixed-reality-extension-sdk/blob/master/packages/functional-tests/src/tests/livestream-test.ts


		const mediaSchedule = await this.loadMediaSchedule();
		this.timeLine = new ScheduledMediaPlayer(this.assets, mediaSchedule.mediaSchedule);
		this.context.users.forEach(user => this.createScreenForUser(user));
		log.info("app", "Created screens for %d users in the space", this.context.users.length)
		this.timeLine.start();
	}

	private onUserJoined = (user: MRE.User) => {
		log.info("app", "User joined session %s: %s", this.context.sessionId, JSON.stringify(user.toJSON()));
		if (this.timeLine) {
			this.createScreenForUser(user);
		}
	}

	private createScreenForUser = (user: MRE.User) => {
		assert(this.timeLine);
		const screen = MRE.Actor.CreatePrimitive(this.assets, {
			actor: { exclusiveToUser: user.id },
			definition: {shape: MRE.PrimitiveShape.Box, dimensions: { z:1 } }
		});
		this.timeLine.addScreen(screen);
	}

	private onUserLeft = (user: MRE.User) => {
		log.info("app", "User left session %s: %s", this.context.sessionId, JSON.stringify(user.toJSON()));
		const userActors = Array.from(this.context.actors.filter(actor => actor.exclusiveToUser === user.id));
		userActors.forEach(actor => this.timeLine.removeScreen(actor));
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
