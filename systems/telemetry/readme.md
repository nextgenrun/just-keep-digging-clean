# Player session data

Bounded session recording and delivery, isolated from gameplay save storage.
Only a two-copy acknowledgement removes a batch. Input listeners are passive,
text field contents are excluded, and telemetry never writes game save keys.
