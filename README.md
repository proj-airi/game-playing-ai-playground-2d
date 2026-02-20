# 2D Game Playing AI Playground(WIP)

This is a playground for some models that can play 2D games.

- Deployed on HuggingFace space.
- Powered by [ONNX](https://onnx.ai/) runtime.

## Usage

- Upload a image[^1] to detect objects in the image.
- Connect to your VNC server to play games and detect objects in real-time.

[^1]: Square image is required when using Factorio YOLO v0 model.

There are some methods to run object detection model in real-time.

- Run game client in Docker
- TODO: Capture game screen
- TODO: Upload video file

### Run Game Client in Docker

Please follow the instructions below to run game client in Docker.

<details>
<summary>Factorio</summary>

Because of the license of Factorio, we cannot provide pre-built Factorio docker image, you need to build it yourself.

First, clone the repository:

```bash
git clone https://github.com/moeru-ai/airi-factorio.git
cd airi-factorio/docker
```

Then, build the docker image, you can find the version history [here](https://wiki.factorio.com/Version_history):

```bash
docker build . -t factorio-gui --build-arg factorio_login='<USERNAME>' --build-arg factorio_pwd='<PASSWORD>' --build-arg factorio_version=<VERSION>
```

Then, run the docker container:

```bash
docker run -it -p 5900:5900 -p 5901:5901 factorio-gui
```

After that, you can visit `http://localhost:5901/vnc.html` to play Factorio.
</details>


You need to type `ws://localhost:5901/websockify` in the `WebSocket URL` field, and then click `Connect`, after connected, you can play the game and view detection result in real-time.
