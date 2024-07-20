'use strict';

const mediaStreamConstraints = {
    video: true,
};

// Set up to exchange only video.
const offerOptions = {
    offerToReceiveVideo: 1,
  };

// Define initial start time of the call (defined as connection between peers).
let startTime = null;

// Define action buttons.
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callButton = document.getElementById('callButton');
const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');
const setLocDescButton = document.getElementById('setLocalDescButton');
// Set up initial action buttons status: disable call and hangup.
callButton.disabled = true;
hangupButton.disabled = true;

let localStream;
let remoteStream;
let globalCandidate;
let pc;
let remotePeerConnection;
let isStarted = false;

let dataChannel;
let receiveChannel;
let dataConstraint;
const sendButton = document.getElementById('sendButton');
const dataChannelSend = document.querySelector('textarea#dataChannelSend');
const dataChannelReceive = document.querySelector('textarea#dataChannelReceive');

const ioInput = document.getElementById('ioInput');
const ioSendButton = document.getElementById('ioSendButton');
ioSendButton.addEventListener('click', (e) => {
  if (ioInput.value) {
    socket.emit('message', ioInput.value);
    ioInput.value = '';
  }
});

function gotLocalMediaStream(mediaStream) {
    localStream = mediaStream;
    localVideo.srcObject = mediaStream;
    trace('Received local stream.');
    callButton.disabled = false;
    callAction();
}

function gotRemoteMediaStream(event) {
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace('Received remote stream.');
}

function handleMediaStreamError(error) {
    console.log('navigator.getUserMedia error: ', error);
}


// Handles error by logging a message to the console.
function handleLocalMediaStreamError(error) {
    trace(`navigator.getUserMedia error: ${error.toString()}.`);
  }

  // Logs changes to the connection state.
function handleConnectionChange(event) {
    const peerConnection = event.target;
    console.log('ICE state change event: ', event);
    trace(`ICE state: ` +
          `${peerConnection.iceConnectionState}.`);
  }

  // Add behavior for video streams.

// Logs a message with the id and size of a video element.
function logVideoLoaded(event) {
    const video = event.target;
    trace(`${video.id} videoWidth: ${video.videoWidth}px, ` +
          `videoHeight: ${video.videoHeight}px.`);
  }
  
  // Logs a message with the id and size of a video element.
  // This event is fired when video begins streaming.
  function logResizedVideo(event) {
    logVideoLoaded(event);
  
    if (startTime) {
      const elapsedTime = window.performance.now() - startTime;
      startTime = null;
      trace(`Setup time: ${elapsedTime.toFixed(3)}ms.`);
    }
  }
  
  localVideo.addEventListener('loadedmetadata', logVideoLoaded);
  remoteVideo.addEventListener('loadedmetadata', logVideoLoaded);
  remoteVideo.addEventListener('onresize', logResizedVideo);


// Logs offer creation and sets peer connection session descriptions.
function createdOffer(description) {
    trace(`Offer from localPeerConnection:\n${description.sdp}`);

    trace('localPeerConnection setLocalDescription start.');
  pc.setLocalDescription(description)
    .then(() => {
      setLocalDescriptionSuccess(pc);
    }).catch(setSessionDescriptionError);

    trace('sent description to remote start.');
    socket.emit("sdp", {"sdp": description});
}





// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}.`);
  }
  
  // Logs success when setting session description.
  function setDescriptionSuccess(peerConnection, functionName) {
    trace(`${functionName} complete.`);
  }
  
  // Logs success when localDescription is set.
  function setLocalDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setLocalDescription');
  }
  
  // Logs success when remoteDescription is set.
  function setRemoteDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
  }



function createdAnswer(description) {
    trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

    trace('setLocalDescription start.');
    pc.setLocalDescription(description)
        .then(() => {
            setLocalDescriptionSuccess(pc);
        }).catch(setSessionDescriptionError);

    trace('sent answer description to local start.');
    socket.emit('sdp', {'sdp': description});
}

// Logs that the connection succeeded.
function handleConnectionSuccess(peerConnection) {
    trace(`addIceCandidate success.`);
  };
  
  // Logs that the connection failed.
  function handleConnectionFailure(peerConnection, error) {
    trace(`failed to add ICE Candidate:\n`+
          `${error.toString()}.`);
  }

function handleConnection(event) {
    const iceCandidate = event.candidate;
    console.log("browser give candidate", iceCandidate);
    trace(`Start handleConnection`);
    if (iceCandidate) {
      socket.emit('candidate', {
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate});
    } else {
      trace(`empty candidate`);
    }
}

// Handles start button action: creates local MediaStream.
function startAction() {
    startButton.disabled = true;
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
      .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
    trace('Requesting local stream.');
}

// Handles call button action: creates peer connection.
function callAction() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    trace('Starting call.');
    startTime = window.performance.now();

    // Get local media stream tracks.
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();
    if (videoTracks.length > 0) {
        trace(`Using video device: ${videoTracks[0].label}.`);
    }
    if (audioTracks.length > 0) {
        trace(`Using audio device: ${audioTracks[0].label}.`);
    }

    const servers = {
      iceServers: [
        {
          urls: "stun:stun.relay.metered.ca:80",
        },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "0a5ded47e1129e5d8532cd83",
          credential: "QggTs0zK1nF2r94e",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "0a5ded47e1129e5d8532cd83",
          credential: "QggTs0zK1nF2r94e",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "0a5ded47e1129e5d8532cd83",
          credential: "QggTs0zK1nF2r94e",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "0a5ded47e1129e5d8532cd83",
          credential: "QggTs0zK1nF2r94e",
        },
    ],
      /*iceServers: [
        {
          "urls": "stun:stun.l.google.com:19302"
        },
        {
          "urls": "turn:webrtc.jiazheng.de:3478",
          "username": "1711078614:jiazheng",
          "credential": "B61crzGIpXmxxj7AiIXgqp6Lb3U="
        },
      ]*/
    };

    // DataChannel
    dataChannelSend.placeholer = '';

    pc = new RTCPeerConnection(servers);
    trace('Created local peer connection object localPeerConnection.');
    isStarted = true;
    dataChannel = pc.createDataChannel('sendDataChannel', 
        dataConstraint)
    trace('Created send data channel');

    pc.addEventListener('icecandidate', handleConnection);
    pc.addEventListener(
        'iceconnectionstatechange', handleConnectionChange);
    
    dataChannel.addEventListener('open', onSendChannelStateChange);
    dataChannel.addEventListener('close', onSendChannelStateChange);


    pc.addEventListener('addstream', gotRemoteMediaStream);
    pc.addEventListener('datachannel', receiveChannelCallback);

    // Add local stream to connection and create offer to connect.
    pc.addStream(localStream);
    trace('Added local stream to localPeerConnection.');
}


// Handles hangup action: ends up call, closes connections and resets peers.
function hangupAction() {
    dataChannel.close();
    trace('Closed data channel with label: ' + dataChannel.label);
    receiveChannel.close();
    trace('Closed data channel with label: ' + receiveChannel.label);
    pc.close();
    pc = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
    trace('Ending call.');

    dataChannelSend.value = '';
    dataChannelReceive.value = '';
    dataChannelSend.disabled = true;

  }

function onSendChannelStateChange() {
  let readyState = dataChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    sendButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
  }
}

function receiveChannelCallback(event) {
  trace('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.addEventListener('message', receiveMessageCallback);
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;

}

function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
}

function receiveMessageCallback(event) {
  trace('Received Message');
  dataChannelReceive.value = event.data;
}

function sendData() {
  let data = dataChannelSend.value;
  dataChannel.send(data);
  trace('Sent Data: ' + data);
}


// Add click event handlers for buttons.
startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);
sendButton.addEventListener('click', sendData);
setLocDescButton.addEventListener('click', startAgain);

// Logs an action (text) and the time when it happened on the console.
function trace(text) {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);
  
    console.log(now, text);
  }


var isInitiator;
window.room = prompt("Enter room name:");
const socket = io();

if (room !== "") {
  console.log("Asking to join room " + room);
  socket.emit('create or join', room);
}

socket.on('created', function(room, clientId) {
  isInitiator = true;
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full :^(');
});

socket.on('joined', function(room, clientId) {
  isInitiator = false;
});

socket.on('message', (msg) => {
  console.log("message received: "+ msg);
});



socket.on('sdp', (data) => {
  console.log("receive sdp");
  if (isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    if (!isInitiator) {
      pc.createAnswer()
        .then(createdAnswer)
        .catch(setSessionDescriptionError);
    }
}
});

socket.on('candidate', (data) => {
  
  var thiscandidate = new RTCIceCandidate({
    sdpMLineIndex: data.label,
    sdpMid: data.id,
    candidate: data.candidate
  });
  console.log("receive candidate", thiscandidate);
  if (isStarted) {
    pc.addIceCandidate(thiscandidate)
      .then(handleConnectionSuccess)
      .catch(handleConnectionFailure);
  }
});

socket.on('ready', (data) => {
  console.log("this room is ready!");
  if (isInitiator && isStarted) {
    
    pc.createOffer().then((desc)=>gotDescription(desc));
  }
});

function startAgain() {
  pc.createOffer().then((desc)=>gotDescription(desc));
}

function gotDescription(desc) {
  pc.setLocalDescription(desc);
  socket.emit('sdp', {"sdp": desc});
}
startAction();
