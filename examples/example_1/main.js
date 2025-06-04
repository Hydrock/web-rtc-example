const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const ws = new WebSocket('ws://localhost:3000');
const peer = new RTCPeerConnection({
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
});

peer.onnegotiationneeded = async () => {
    console.log('🧩 negotiationneeded');
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'offer', offer }));
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    localVideo.srcObject = stream;
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
    console.log('🎥 Добавлены локальные треки:', stream.getTracks());
});

peer.ontrack = event => {
    console.log('📡 Получен remote track:', event.streams);
    remoteVideo.srcObject = event.streams[0];
};

peer.onicecandidate = event => {
    if (event.candidate) {
        ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
    }
};

ws.onmessage = async ({ data }) => {
    const text = typeof data === 'string' ? data : await data.text();
    const msg = JSON.parse(text);

    if (msg.type === 'offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(msg.offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', answer }));
    } else if (msg.type === 'answer') {
        await peer.setRemoteDescription(new RTCSessionDescription(msg.answer));
    } else if (msg.type === 'candidate') {
        await peer.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
};
