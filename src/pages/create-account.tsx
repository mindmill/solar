import React from "react"
import { Keypair } from "stellar-sdk"
import { useRouter, useIsSmallMobile } from "../hooks"
import * as routes from "../routes"
import { Section } from "../components/Layout/Page"
import AccountCreationForm, { AccountCreationValues } from "../components/Form/CreateAccount"
import { AccountsContext } from "../context/accounts"
import { trackError } from "../context/notifications"

function CreateAccountPage(props: { testnet: boolean }) {
  const { accounts, createAccount } = React.useContext(AccountsContext)
  const router = useRouter()
  const isTinyScreen = useIsSmallMobile()

  const onCreateAccount = async (formValues: AccountCreationValues) => {
    try {
      const account = await createAccount({
        name: formValues.name,
        keypair: Keypair.fromSecret(formValues.privateKey),
        password: formValues.setPassword ? formValues.password : null,
        testnet: props.testnet
      })
      router.history.push(routes.account(account.id))
    } catch (error) {
      trackError(error)
    }
  }

  const onClose = () => router.history.push(routes.allAccounts())

  return (
    <Section top bottom pageInset={!isTinyScreen}>
      <AccountCreationForm accounts={accounts} onCancel={onClose} onSubmit={onCreateAccount} testnet={props.testnet} />
    </Section>
  )
}

export default CreateAccountPage
