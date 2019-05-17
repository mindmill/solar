import React from "react"
import TextField from "@material-ui/core/TextField"
import CheckIcon from "@material-ui/icons/Check"
import CloseIcon from "@material-ui/icons/Close"
import { Transaction } from "stellar-sdk"
import { Account } from "../../context/accounts"
import { renderFormFieldError } from "../../lib/errors"
import { SettingsContext } from "../../context/settings"
import { SignatureRequest } from "../../lib/multisig-service"
import { ActionButton, DialogActionsBox, ConfirmDialog } from "../Dialog/Generic"
import { VerticalLayout } from "../Layout/Box"
import TransactionSummary from "../TransactionSummary/TransactionSummary"

type FormErrors = { [formField in keyof FormValues]: Error | null }

interface FormValues {
  password: string | null
}

interface Props {
  account: Account
  disabled?: boolean
  passwordError?: Error | null
  signatureRequest?: SignatureRequest
  transaction: Transaction
  onConfirm?: (formValues: FormValues) => any
  onDismiss?: () => void
}

function TxConfirmationForm(props: Props) {
  const settings = React.useContext(SettingsContext)

  const { onConfirm = () => undefined } = props

  const [errors, setErrors] = React.useState<Partial<FormErrors>>({})
  const [formValues, setFormValues] = React.useState<FormValues>({ password: null })
  const [pendingConfirmation, setPendingConfirmation] = React.useState<SignatureRequest | null>(null)

  const passwordError = props.passwordError || errors.password

  const setFormValue = <Key extends keyof FormValues>(key: keyof FormValues, value: FormValues[Key]) => {
    setFormValues(prevValues => ({
      ...prevValues,
      [key]: value
    }))
  }

  const onConfirmDismissal = () => {
    if (!pendingConfirmation) return

    settings.ignoreSignatureRequest(pendingConfirmation.hash)
    setPendingConfirmation(null)

    if (props.onDismiss) {
      props.onDismiss()
    }
  }

  const onSubmit = (event: React.SyntheticEvent) => {
    if (props.disabled) {
      // Just a precaution; we shouldn't even get here if the component is disabled
      return
    }

    if (props.account.requiresPassword && !formValues.password) {
      return setErrors({
        ...errors,
        password: new Error("Password required")
      })
    }

    event.preventDefault()
    setErrors({})
    onConfirm(formValues)
  }

  return (
    <form onSubmit={onSubmit}>
      <VerticalLayout>
        <TransactionSummary
          account={props.account}
          showSource={props.account.publicKey !== props.transaction.source}
          signatureRequest={props.signatureRequest}
          testnet={props.account.testnet}
          transaction={props.transaction}
        />
        {props.account.requiresPassword && !props.disabled ? (
          <TextField
            autoFocus={process.env.PLATFORM !== "ios"}
            error={Boolean(passwordError)}
            label={passwordError ? renderFormFieldError(passwordError) : "Password"}
            type="password"
            fullWidth
            margin="dense"
            value={formValues.password || ""}
            onChange={event => setFormValue("password", event.target.value)}
            style={{ marginBottom: 32 }}
          />
        ) : null}
        <DialogActionsBox desktopStyle={{ justifyContent: "center" }}>
          {props.signatureRequest ? (
            <ActionButton
              icon={<CloseIcon />}
              onClick={() => setPendingConfirmation(props.signatureRequest ? props.signatureRequest : null)}
            >
              Dismiss
            </ActionButton>
          ) : (
            undefined
          )}
          {props.disabled ? null : (
            <ActionButton icon={<CheckIcon />} onClick={() => undefined} type="submit">
              Confirm
            </ActionButton>
          )}
        </DialogActionsBox>
      </VerticalLayout>
      <ConfirmDialog
        cancelButton={<ActionButton onClick={() => setPendingConfirmation(null)}>Cancel</ActionButton>}
        confirmButton={
          <ActionButton onClick={onConfirmDismissal} type="primary">
            Confirm
          </ActionButton>
        }
        onClose={() => setPendingConfirmation(null)}
        open={pendingConfirmation !== null}
        title="Confirm dismissal"
      >
        Dismiss pending multi-signature transaction?
      </ConfirmDialog>
    </form>
  )
}

export default TxConfirmationForm
