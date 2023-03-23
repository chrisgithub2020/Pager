

module.exports.get_video_stream = async ()=>{
    const constraint = {
        video:true,
        audio:false
    }
    navigator.mediaDevices.getUserMedia(constraint).then((stream)=>{
        console.log(stream)
    })
}

module.exports.get_images = async ()=>{
    const constraint = {
        video:true,
        audio:false
    }
    navigator.mediaDevices.getUserMedia(constraint).then((stream)=>{
        console.log(stream)
    })
}

module.exports.get_audio = async ()=>{
    
}