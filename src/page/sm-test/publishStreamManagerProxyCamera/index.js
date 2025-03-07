/*
Copyright © 2015 Infrared5, Inc. All rights reserved.

The accompanying code comprising examples for use solely in conjunction with Red5 Pro (the "Example Code")
is  licensed  to  you  by  Infrared5  Inc.  in  consideration  of  your  agreement  to  the  following
license terms  and  conditions.  Access,  use,  modification,  or  redistribution  of  the  accompanying
code  constitutes your acceptance of the following license terms and conditions.

Permission is hereby granted, free of charge, to you to use the Example Code and associated documentation
files (collectively, the "Software") without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The Software shall be used solely in conjunction with Red5 Pro. Red5 Pro is licensed under a separate end
user  license  agreement  (the  "EULA"),  which  must  be  executed  with  Infrared5,  Inc.
An  example  of  the EULA can be found on our website at: https://account.red5.net/assets/LICENSE.txt.

The above copyright notice and this license shall be included in all copies or portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,  INCLUDING  BUT
NOT  LIMITED  TO  THE  WARRANTIES  OF  MERCHANTABILITY, FITNESS  FOR  A  PARTICULAR  PURPOSE  AND
NONINFRINGEMENT.   IN  NO  EVENT  SHALL INFRARED5, INC. BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN  AN  ACTION  OF  CONTRACT,  TORT  OR  OTHERWISE,  ARISING  FROM,  OUT  OF  OR  IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
;(function (window, document, red5prosdk) {
  'use strict'

  var serverSettings = (function () {
    var settings = sessionStorage.getItem('r5proServerSettings')
    try {
      return JSON.parse(settings)
    } catch (e) {
      console.error(
        'Could not read server settings from sessionstorage: ' + e.message
      )
    }
    return {}
  })()

  var configuration = (function () {
    var conf = sessionStorage.getItem('r5proTestBed')
    try {
      return JSON.parse(conf)
    } catch (e) {
      console.error(
        'Could not read testbed configuration from sessionstorage: ' + e.message
      )
    }
    return {}
  })()
  red5prosdk.setLogLevel(
    configuration.verboseLogging
      ? red5prosdk.LOG_LEVELS.TRACE
      : red5prosdk.LOG_LEVELS.WARN
  )

  var targetPublisher

  var updateStatusFromEvent = window.red5proHandlePublisherEvent // defined in src/template/partial/status-field-publisher.hbs
  var streamTitle = document.getElementById('stream-title')
  var statisticsField = document.getElementById('statistics-field')
  var addressField = document.getElementById('address-field')
  var bitrateField = document.getElementById('bitrate-field')
  var packetsField = document.getElementById('packets-field')
  var resolutionField = document.getElementById('resolution-field')
  var cameraSelect = document.getElementById('camera-select')
  var publishButton = document.getElementById('publish-button')

  var protocol = serverSettings.protocol
  var isSecure = protocol == 'https'
  function getSocketLocationFromProtocol() {
    return !isSecure
      ? { protocol: 'ws', port: serverSettings.wsport }
      : { protocol: 'wss', port: serverSettings.wssport }
  }

  function getAuthenticationParams() {
    var auth = configuration.authentication
    return auth && auth.enabled
      ? {
          connectionParams: {
            username: auth.username,
            password: auth.password,
            token: auth.token,
          },
        }
      : {}
  }

  streamTitle.innerText = configuration.stream1
  var defaultConfiguration = {
    protocol: getSocketLocationFromProtocol().protocol,
    port: getSocketLocationFromProtocol().port,
    streamMode: configuration.recordBroadcast ? 'record' : 'live',
    bandwidth: {
      video: 750,
    },
  }

  var mediaConstraints = {
    video: {
      width: {
        exact: 640,
      },
      height: {
        exact: 360,
      },
      frameRate: {
        exact: 24,
      },
    },
    audio: true,
  }

  const displayServerAddress = (serverAddress, proxyAddress) => {
    addressField.classList.remove('hidden')
    proxyAddress = typeof proxyAddress === 'undefined' ? 'N/A' : proxyAddress
    addressField.innerText = `Proxy Address: ${proxyAddress} | Origin Address: ${serverAddress}`
  }

  var bitrate = 0
  var packetsSent = 0
  var frameWidth = 0
  var frameHeight = 0

  function updateStatistics(b, p, w, h) {
    statisticsField.classList.remove('hidden')
    bitrateField.innerText = b === 0 ? 'N/A' : Math.floor(b)
    packetsField.innerText = p
    resolutionField.innerText = (w || 0) + 'x' + (h || 0)
  }

  function onBitrateUpdate(b, p) {
    bitrate = b
    packetsSent = p
    updateStatistics(bitrate, packetsSent, frameWidth, frameHeight)
  }

  function onResolutionUpdate(w, h) {
    frameWidth = w
    frameHeight = h
    updateStatistics(bitrate, packetsSent, frameWidth, frameHeight)
  }
  function onPublisherEvent(event) {
    const { type } = event
    console.log('[Red5ProPublisher] ' + type + '.')
    updateStatusFromEvent(event)
    if (type === 'WebRTC.Endpoint.Changed') {
      const { host } = configuration
      const { data } = event
      const { endpoint } = data
      displayServerAddress(endpoint, host)
    }
  }
  function onPublishFail(message) {
    console.error('[Red5ProPublisher] Publish Error :: ' + message)
  }
  function onPublishSuccess(publisher) {
    console.log('[Red5ProPublisher] Publish Complete.')
    try {
      var pc = publisher.getPeerConnection()
      var stream = publisher.getMediaStream()
      window.trackBitrate(pc, onBitrateUpdate, onResolutionUpdate)
      statisticsField.classList.remove('hidden')
      stream.getVideoTracks().forEach(function (track) {
        var settings = track.getSettings()
        onResolutionUpdate(settings.width, settings.height)
      })
      publishButton.disabled = true
    } catch (e) {
      // no tracking for you!
    }
  }
  function onUnpublishFail(message) {
    console.error('[Red5ProPublisher] Unpublish Error :: ' + message)
  }
  function onUnpublishSuccess() {
    console.log('[Red5ProPublisher] Unpublish Complete.')
    publishButton.disabled = false
  }

  function onDeviceError(error) {
    console.error('Could not access devices: ' + error)
  }

  function listDevices(devices) {
    var cameras = devices.filter(function (item) {
      return item.kind === 'videoinput'
    })
    var options = cameras.map(function (camera, index) {
      return (
        '<option value="' +
        camera.deviceId +
        '">' +
        (camera.label || 'camera ' + index) +
        '</option>'
      )
    })
    cameraSelect.innerHTML = options.join(' ')
    return devices.length > 0 ? cameras[0].deviceId : undefined
  }

  function getRegionIfDefined() {
    var region = configuration.streamManagerRegion
    if (
      typeof region === 'string' &&
      region.length > 0 &&
      region !== 'undefined'
    ) {
      return region
    }
    return undefined
  }

  function establishCameraSelection(selection) {
    var pubElement = document.getElementById('red5pro-publisher')
    if (mediaConstraints.video && typeof mediaConstraints.video !== 'boolean') {
      mediaConstraints.video.deviceId = { exact: selection }
      delete mediaConstraints.video.frameRate
    } else {
      mediaConstraints.video = {
        deviceId: { exact: selection },
      }
    }
    navigator.mediaDevices
      .getUserMedia(mediaConstraints)
      .then(function (mediastream) {
        pubElement.srcObject = mediastream
      })
      .catch(function (error) {
        console.error(
          '[Red5ProPublisher] :: Error in media selection - ' + error
        )
      })
    publishButton.disabled = false
  }

  async function swapCameraSelection(selection) {
    const connection = targetPublisher.getPeerConnection()
    if (mediaConstraints.video && typeof mediaConstraints.video !== 'boolean') {
      mediaConstraints.video.deviceId = { exact: selection }
      delete mediaConstraints.video.frameRate
    } else {
      mediaConstraints.video = {
        deviceId: { exact: selection },
      }
    }
    mediaConstraints.audio = configuration.useAudio
      ? configuration.mediaConstraints.audio
      : false
    // In the below flag, we originally equated it to being an older Chrome version,
    //  however, it turns out it was not necessarily just the browser but could also be the Android OS...
    //  As a result, we stop all tracks for all browsers now before requesting `getUserMedia` again.
    let requiresTrackStopBeforeGUM = true // Add any other criteria here.
    const senders = connection.getSenders()
    if (requiresTrackStopBeforeGUM) {
      // Note: In some older mobile browsers, it is required to stop all current tracks before requesting
      // media through `getUserMedia` again.
      // This has the unfortunate side affect of the video going "black" until new media is accessed.
      senders.forEach(function (sender) {
        sender.track.stop()
      })
    }
    // 1. Grab new MediaStream from updated constraints.
    const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    // 2. Update the media tracks on senders through connection.
    let i = senders.length
    while (--i > -1) {
      // 3. Replace the currently sending streams based on track kind
      if (!requiresTrackStopBeforeGUM) {
        senders[i].track.stop()
      }
      if (senders[i].track.kind === 'video') {
        senders[i].replaceTrack(stream.getVideoTracks()[0])
      } else {
        senders[i].replaceTrack(stream.getAudioTracks()[0])
      }
    }
    // 4. Update the video display with new stream.
    document.getElementById('red5pro-publisher').srcObject = stream
  }

  function onCameraSelect(selection) {
    if (!configuration.useVideo) {
      return
    }

    if (targetPublisher && targetPublisher.getPeerConnection()) {
      // Already established broadcast. Swap camera live.
      try {
        swapCameraSelection(selection)
      } catch (e) {
        console.error(`Could not replace camera: ${e.message}`)
      }
    } else {
      // Else we just need to replace selection prior to broadcast.
      establishCameraSelection(selection)
    }
  }

  const getConfiguration = () => {
    const {
      host,
      app,
      stream1,
      streamManagerAPI,
      preferWhipWhep,
      streamManagerNodeGroup: nodeGroup,
    } = configuration
    const { protocol, port } = getSocketLocationFromProtocol()

    const region = getRegionIfDefined()
    const params = region
      ? {
          region,
          strict: true,
        }
      : undefined

    const httpProtocol = protocol === 'wss' ? 'https' : 'http'
    const endpoint = !preferWhipWhep
      ? `${protocol}://${host}:${port}/as/${streamManagerAPI}/proxy/ws/publish/${app}/${stream1}`
      : `${httpProtocol}://${host}:${port}/as/${streamManagerAPI}/proxy/whip/${app}/${stream1}`

    const connectionParams = params
      ? { ...params, ...getAuthenticationParams().connectionParams }
      : getAuthenticationParams().connectionParams

    const rtcConfig = {
      ...configuration,
      ...defaultConfiguration,
      mediaConstraints,
      endpoint,
      streamName: stream1,
      connectionParams: {
        ...connectionParams,
        nodeGroup,
      },
    }
    return rtcConfig
  }

  const startPublish = async () => {
    try {
      const pubElement = document.getElementById('red5pro-publisher')
      const { RTCPublisher, WHIPClient } = red5prosdk
      const { preferWhipWhep, stream1 } = configuration
      const config = getConfiguration()
      const publisher = preferWhipWhep ? new WHIPClient() : new RTCPublisher()
      publisher.on('*', onPublisherEvent)
      await publisher.initWithStream(config, pubElement.srcObject)
      await publisher.publish()
      onPublishSuccess(publisher)
      streamTitle.innerText = stream1
      targetPublisher = publisher
    } catch (error) {
      var jsonError =
        typeof error === 'string' ? error : JSON.stringify(error, null, 2)
      console.error(
        '[Red5ProPublisher] :: Error in access of Origin IP: ' + jsonError
      )
      updateStatusFromEvent({
        type: red5prosdk.PublisherEventTypes.CONNECT_FAILURE,
      })
      onPublishFail(jsonError)
    }
  }

  const unpublish = async () => {
    try {
      const publisher = targetPublisher
      await publisher.unpublish()
      onUnpublishSuccess()
    } catch (error) {
      var jsonError =
        typeof error === 'string' ? error : JSON.stringify(error, 2, null)
      onUnpublishFail('Unmount Error ' + jsonError)
      throw error
    }
  }

  let shuttingDown = false
  const shutdown = async () => {
    if (shuttingDown) return
    shuttingDown = true
    try {
      await unpublish()
    } catch (e) {
      console.error(e)
    } finally {
      if (targetPublisher) {
        targetPublisher.off('*', onPublisherEvent)
      }
      targetPublisher = undefined
    }
    window.untrackBitrate()
  }
  window.addEventListener('pagehide', shutdown)
  window.addEventListener('beforeunload', shutdown)

  navigator.mediaDevices
    .enumerateDevices()
    .then(listDevices)
    .then(onCameraSelect)
    .catch(onDeviceError)

  cameraSelect.addEventListener('change', function () {
    onCameraSelect(cameraSelect.value)
  })
  publishButton.addEventListener('click', startPublish)
})(this, document, window.red5prosdk)
