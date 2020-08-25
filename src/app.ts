/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable linebreak-style */
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import fetch from 'node-fetch'; 
import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { ScheduledMediaPlayer } from './scheduled-media-player';
import { getParameterLastValue } from './parameter-set-util';

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
		this.context.onStarted(() => this.started());
		this.assets = new MRE.AssetContainer(this.context);
		this.timeLine = new ScheduledMediaPlayer(this.assets, []);
		this.mediaScheduleUrl = getParameterLastValue(params, "ms");
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
		this.timeLine = new ScheduledMediaPlayer(this.assets, mediaSchedule);
		this.timeLine.start(this.curve);
	}

	// Stub implementation. Replace with actual implementation
	private async loadMediaSchedule() {
		const schedule = await fetch(this.mediaScheduleUrl).then(res => res.json());
		return schedule;
	}
}
