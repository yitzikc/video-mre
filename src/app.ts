/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable linebreak-style */
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { ScheduledMediaPlayer } from './scheduled-media-player';


/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
	private curve: MRE.Actor = null;
	private video: MRE.VideoStream = null;	// Remove
	private assets: MRE.AssetContainer;
	private timeLine: ScheduledMediaPlayer;

	constructor(private context: MRE.Context, private params: MRE.ParameterSet, private baseUrl: string) {
		this.context.onStarted(() => this.started());
		this.assets = new MRE.AssetContainer(this.context);
		this.timeLine = new ScheduledMediaPlayer(this.assets, []);
		/*
		const value = params["vs"];
		if (typeof(value) === 'string') {
			this.videoUrl = decodeURIComponent(value);
		} else if (Array.isArray(value)) {
			this.videoUrl = decodeURIComponent(value[value.length - 1]);
		}
*/
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private started() {
		// eslint-disable-next-line max-len
		// See https://github.com/microsoft/mixed-reality-extension-sdk/blob/master/packages/functional-tests/src/tests/livestream-test.ts
		// Load a glTF model
		//MRE.log.enable("app", "debug");
		//MRE.log.info("app", "starting");

		this.curve = MRE.Actor.CreatePrimitive(this.assets, {
			definition: { shape: MRE.PrimitiveShape.Box, dimensions: { z:1 } }
		});

		const mediaSchedule = this.loadMediaSchedule();
		this.timeLine = new ScheduledMediaPlayer(this.assets, mediaSchedule);
		this.timeLine.start(this.curve);
	}

	// Stub implementation. Replace with actual implementation
	private loadMediaSchedule = () => {
		return [ {
			startTime: "+00:00:5",
			endTime: "+00:00:20",
			uri: "youtube://wHDVX2E8nLY",
			volume: 1,
		}, {
			startTime: "+00:00:30",
			uri: "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4?_=1",
			volume: 1,
		}, {
			startTime: "+00:00:45",
			uri: "https://bitmovin-a.akamaihd.net/content/playhouse-vr/m3u8s/105560.m3u8",
			endTime: "+00:00:20",
			volume: 1,
		}
		];
	}
}
