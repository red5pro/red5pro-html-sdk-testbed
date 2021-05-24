# Subscribe Live VOD

This is an example of being able to seek to a specific time within a live stream. It uses Fragmented MP4 (a.k.a. FMP4) to save `ts` files on a server that are appended to a `m3u8` and loaded and played back within a `video` container utilizing the [HLS.JS](https://github.com/video-dev/hls.js/) library.

**Please refer to the [Basic Subscriber Documentation](../subscribe/README.md) to learn more about the basic setup.**

## Example Code
- **[index.html](index.html)**
- **[index.js](index.js)**

# Server Requirements

This example requires the following configuration properties in order to allow HLS recording on the server to support `FMP4` playback:

**conf/hlsconfig.xml**

* 
* 

# Client Requirements

## HLS.JS

The SDK requires the dependency of [HLS.JS](https://github.com/video-dev/hls.js/) 3rd-party library in order to achieve live seek of a stream.

It is added as a dependency in this example here: [https://github.com/red5pro/streaming-html5/blob/feature/greatdane06_honorlock_vod_HON-18/src/page/test/subscribeLiveVOD/index.html#L8](https://github.com/red5pro/streaming-html5/blob/feature/greatdane06_honorlock_vod_HON-18/src/page/test/subscribeLiveVOD/index.html#L8)

```html
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
```

> Other 3rd-Party integrations are on the road map.

## enableLiveSeek

The initialization configuration property of `enableLiveSeek` is a `Boolean` value that turns on the capability to enable live seeking (when set to `true`).

```js
const rtcConfig = {...config, ...{
  protocol: getSocketLocationFromProtocol().protocol,
  port: getSocketLocationFromProtocol().port,
  subscriptionId: 'subscriber-' + instanceId,
  enableLiveSeek: true
}}
```

[https://github.com/red5pro/streaming-html5/blob/feature/greatdane06_honorlock_vod_HON-18/src/page/test/subscribeLiveVOD/index.js#L165-L170](https://github.com/red5pro/streaming-html5/blob/feature/greatdane06_honorlock_vod_HON-18/src/page/test/subscribeLiveVOD/index.js#L165-L170)

# Example

Aside from the initialization configuration of `enableLiveSeek` described above, the subscription to a live stream is the same as you would normally do as a developer.

## Events

The following events are available when `enableLiveSeek` is set to `true`:

| Access | Name | Meaning |
| :--- | :---: | :--- |
| LIVE_SEEK_ENABLED | 'WebRTC.LiveSeek.Enabled' | When `enableLiveSeek` is used to playback Live VOD and the HLS video has been loaded and available to seek. |
| LIVE_SEEK_DISABLED | 'WebRTC.LiveSeek.Disabled' | When `enableLiveSeek` is used to playback Live VOD and HLS video has not been loaded nor available to seek. |
| LIVE_SEEK_LOADING | 'WebRTC.LiveSeek.FragmentLoading' | When `enableLiveSeek` is used to playback Live VOD and HLS video in currently loading a fragment during seeking. |
| LIVE_SEEK_LOADED | 'WebRTC.LiveSeek.FragmentLoaded' | When `enableLiveSeek` is used to playback Live VOD and HLS video has completed loading a fragment during seeking. |

