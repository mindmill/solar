import React from "react"
import { sendCommand } from "./message-handler"
import { trackError } from "../../context/notifications"
import { commands } from "../../cordova/ipc"

const isFullscreenQRPreview = true

interface Props {
  onError: (error: Error) => void
  onScan: (data: string) => void
  style?: any // ignored
}

function CordovaQRReader(props: Props): ReturnType<React.FunctionComponent<Props>> {
  React.useEffect(() => {
    sendCommand(commands.scanQRCodeCommand)
      .then(event => {
        props.onScan(event.data.qrdata)
      })
      .catch(error => {
        props.onError(error)
        trackError(error)
      })
  }, [])
  return null
}

export { isFullscreenQRPreview, CordovaQRReader as QRReader }
