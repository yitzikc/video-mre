/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
	private curve: MRE.Actor = null;
	private video: MRE.VideoStream = null;
	private assets: MRE.AssetContainer = null;

	constructor(private context: MRE.Context, private baseUrl: string) {
		this.context.onStarted(() => this.started());
		MRE.log.enabled("curve");
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private started() {
		MRE.log.info("curve","connected");
		// eslint-disable-next-line max-len
		// See https://github.com/microsoft/mixed-reality-extension-sdk/blob/master/packages/functional-tests/src/tests/livestream-test.ts
		this.assets = new MRE.AssetContainer(this.context);
		this.video = this.assets.createVideoStream("aotf", { uri: 'https://bitmovin-a.akamaihd.net/content/playhouse-vr/m3u8s/105560.m3u8' }); //`${this.baseUrl}/aotf.mp4` });
		// Load a glTF model
		this.curve = MRE.Actor.CreatePrimitive(this.assets, {
			definition: { shape: MRE.PrimitiveShape.Box, dimensions: { z:1 } }
		});
		this.curve.startVideoStream(this.video.id, { looping: true });
	}

}
