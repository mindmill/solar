import React from "react"
import Button from "@material-ui/core/Button"
import CircularProgress from "@material-ui/core/CircularProgress"
import Typography from "@material-ui/core/Typography"
import DoneAllIcon from "@material-ui/icons/DoneAll"
import SendIcon from "@material-ui/icons/Send"
import UpdateIcon from "@material-ui/icons/Update"
import ButtonIconLabel from "../components/ButtonIconLabel"
import AccountBalances from "../components/Account/AccountBalances"
import AccountBalancesContainer from "../components/Account/AccountBalancesContainer"
import AccountHeaderCard from "../components/Account/AccountHeaderCard"
import FriendbotButton from "../components/Account/FriendbotButton"
import OfferList from "../components/Account/OfferList"
import { InteractiveSignatureRequestList } from "../components/Account/SignatureRequestList"
import TransactionList from "../components/Account/TransactionList"
import ManageAssetsDialog from "../components/Dialog/ManageAssets"
import ManageSignersDialog from "../components/Dialog/ManageSigners"
import ReceivePaymentDialog from "../components/Dialog/ReceivePayment"
import TradeAssetDialog from "../components/Dialog/TradeAsset"
import { MinimumAccountBalance } from "../components/Fetchers"
import QRCodeIcon from "../components/Icon/QRCode"
import { HorizontalLayout, VerticalLayout } from "../components/Layout/Box"
import { HorizontalMargin } from "../components/Layout/Spacing"
import { Section } from "../components/Layout/Page"
import CreatePaymentDialog from "../components/Payment/CreatePaymentDialog"
import { Account, AccountsContext } from "../context/accounts"
import { SettingsContext } from "../context/settings"
import { SignatureDelegationContext } from "../context/signatureDelegation"
import {
  useIsMobile,
  useAccountData,
  useHorizon,
  useRecentTransactions,
  useRouter,
  ObservedAccountData
} from "../hooks"
import { hasSigned } from "../lib/transaction"
import * as routes from "../routes"

interface AccountActionsProps {
  accountData: ObservedAccountData
  bottomOfScreen?: boolean
  horizontalMargin: number
  onCreatePayment: () => void
  onReceivePayment: () => void
  squareButtons?: boolean
  style?: React.CSSProperties
}

// tslint:disable-next-line no-shadowed-variable
const AccountActions = React.memo(function AccountActions(props: AccountActionsProps) {
  const buttonStyle = {
    border: "none",
    borderRadius: props.squareButtons ? 0 : undefined,
    fontSize: "1rem",
    flexBasis: 1,
    flexGrow: 1,
    padding: 20
  }
  return (
    <HorizontalLayout
      style={{
        flexGrow: 0,
        flexShrink: 0,
        background: props.bottomOfScreen ? "white" : undefined,
        paddingBottom: "env(safe-area-inset-bottom)",
        ...props.style
      }}
    >
      <Button variant="contained" onClick={props.onReceivePayment} style={buttonStyle}>
        <ButtonIconLabel label="Receive">
          <QRCodeIcon style={{ fontSize: "110%" }} />
        </ButtonIconLabel>
      </Button>
      {props.horizontalMargin > 0 ? <HorizontalMargin size={props.horizontalMargin} /> : null}
      <Button
        color="primary"
        variant="contained"
        disabled={!props.accountData.activated}
        onClick={props.onCreatePayment}
        style={buttonStyle}
      >
        <ButtonIconLabel label="Send">
          <SendIcon style={{ fontSize: "110%" }} />
        </ButtonIconLabel>
      </Button>
    </HorizontalLayout>
  )
})

function PendingMultisigTransactions(props: { account: Account }) {
  const { pendingSignatureRequests } = React.useContext(SignatureDelegationContext)
  const rendered = React.useMemo(
    () => (
      <>
        <InteractiveSignatureRequestList
          account={props.account}
          icon={<DoneAllIcon />}
          signatureRequests={pendingSignatureRequests.filter(
            request =>
              request._embedded.signers.some(signer => signer.account_id === props.account.publicKey) &&
              !hasSigned(request.meta.transaction, props.account.publicKey)
          )}
          title="Transactions to co-sign"
        />
        <InteractiveSignatureRequestList
          account={props.account}
          icon={<UpdateIcon style={{ opacity: 0.5 }} />}
          signatureRequests={pendingSignatureRequests.filter(
            request =>
              request._embedded.signers.some(signer => signer.account_id === props.account.publicKey) &&
              hasSigned(request.meta.transaction, props.account.publicKey)
          )}
          title="Awaiting additional signatures"
        />
      </>
    ),
    [pendingSignatureRequests, props.account]
  )
  return rendered
}

function Transactions(props: { account: Account }) {
  const { account } = props
  const horizon = useHorizon(account.testnet)
  const recentTxs = useRecentTransactions(account.publicKey, account.testnet)
  const settings = React.useContext(SettingsContext)

  return (
    <>
      {recentTxs.loading ? (
        <HorizontalLayout alignItems="center" justifyContent="center" height="100%" padding={16} width="100%">
          <CircularProgress />
        </HorizontalLayout>
      ) : recentTxs.activated ? (
        <>
          {settings.multiSignature ? <PendingMultisigTransactions account={account} /> : null}
          <OfferList account={account} title="Open offers" />
          <TransactionList
            accountPublicKey={account.publicKey}
            background="transparent"
            title="Recent transactions"
            testnet={account.testnet}
            transactions={recentTxs.transactions}
          />
        </>
      ) : (
        <>
          <Typography align="center" color="textSecondary" style={{ margin: "30px auto" }}>
            Account does not yet exist on the network. Send at least <MinimumAccountBalance testnet={account.testnet} />
            &nbsp;XLM to activate the account.
          </Typography>
          {account.testnet ? (
            <Typography align="center" style={{ paddingBottom: 30 }}>
              <FriendbotButton horizon={horizon} publicKey={account.publicKey} />
            </Typography>
          ) : null}
        </>
      )}
    </>
  )
}

interface Props {
  accountID: string
  showAssetManagement: boolean
  showAssetTrading: boolean
  showCreatePayment: boolean
  showReceivePayment: boolean
  showSignersManagement: boolean
}

function AccountPage(props: Props) {
  const { accounts, renameAccount } = React.useContext(AccountsContext)

  const account = accounts.find(someAccount => someAccount.id === props.accountID)
  if (!account) {
    throw new Error(`Wallet account not found. ID: ${props.accountID}`)
  }

  const accountData = useAccountData(account.publicKey, account.testnet)
  const isSmallScreen = useIsMobile()
  const router = useRouter()

  const { onCloseDialog, onCreatePayment, onReceivePayment } = React.useMemo(
    () => ({
      onCloseDialog: () => router.history.push(routes.account(props.accountID)),
      onCreatePayment: () => router.history.push(routes.createPayment(props.accountID)),
      onReceivePayment: () => router.history.push(routes.receivePayment(props.accountID))
    }),
    [props.accountID]
  )

  const topActionsStyle = React.useMemo(() => ({ marginTop: 40 }), [])
  const bottomActionsStyle = React.useMemo(() => ({ boxShadow: "0 -8px 16px 0 rgba(0, 0, 0, 0.1)", zIndex: 1 }), [])

  return (
    <VerticalLayout height="100%">
      <Section top brandColored grow={0}>
        <AccountHeaderCard
          account={account}
          onManageAssets={() => router.history.push(routes.manageAccountAssets(props.accountID))}
          onManageSigners={() => router.history.push(routes.manageAccountSigners(props.accountID))}
          onRenameAccount={renameAccount}
        >
          <AccountBalancesContainer>
            <AccountBalances publicKey={account.publicKey} testnet={account.testnet} />
          </AccountBalancesContainer>
          {isSmallScreen ? null : (
            <AccountActions
              accountData={accountData}
              horizontalMargin={40}
              onCreatePayment={onCreatePayment}
              onReceivePayment={onReceivePayment}
              style={topActionsStyle}
            />
          )}
        </AccountHeaderCard>
      </Section>
      <Section
        bottom={!isSmallScreen}
        backgroundColor="#f6f6f6"
        style={{ flexGrow: 1, flexShrink: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}
      >
        <Transactions account={account} />
      </Section>
      {isSmallScreen ? (
        <AccountActions
          accountData={accountData}
          bottomOfScreen
          horizontalMargin={0}
          onCreatePayment={onCreatePayment}
          onReceivePayment={onReceivePayment}
          squareButtons
          style={bottomActionsStyle}
        />
      ) : null}

      <CreatePaymentDialog account={account} open={props.showCreatePayment} onClose={onCloseDialog} />
      <ManageAssetsDialog account={account} open={props.showAssetManagement} onClose={onCloseDialog} />
      <ManageSignersDialog account={account} open={props.showSignersManagement} onClose={onCloseDialog} />
      <ReceivePaymentDialog account={account} open={props.showReceivePayment} onClose={onCloseDialog} />
      <TradeAssetDialog
        account={account}
        open={Boolean(props.showAssetTrading)}
        onClose={() => router.history.push(routes.account(props.accountID))}
      />
    </VerticalLayout>
  )
}

export default AccountPage
