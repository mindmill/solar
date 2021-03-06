import { Server } from "stellar-sdk"
import { trackError } from "../context/notifications"
import { waitForAccountData } from "../lib/account"
import { createSubscriptionTarget, SubscriptionTarget } from "../lib/subscription"
import { manageStreamConnection, trackStreamError } from "../lib/stream"

export interface ObservedAccountOffers {
  loading: boolean
  offers: Server.OfferRecord[]
}

export function createAccountOffersSubscription(
  horizon: Server,
  accountPubKey: string
): SubscriptionTarget<ObservedAccountOffers> {
  const maxOffers = 100
  const { propagateUpdate, subscriptionTarget } = createSubscriptionTarget<ObservedAccountOffers>({
    loading: true,
    offers: []
  })

  const subscribeToStream = () =>
    manageStreamConnection(() => {
      // horizon.offers("accounts", accountPubKey) does not seem to yield any updates, so falling back here...
      const pollingIntervalMs = 5000
      const update = () => {
        if (window.navigator.onLine !== false) {
          // Always set cursor to zero, since we want all the open offers, not just recent ones
          fetchAccountOffers("0").catch(trackStreamError)
        }
      }
      update()
      const interval = setInterval(() => update(), pollingIntervalMs)
      return () => clearInterval(interval)
    })

  const fetchAccountOffers = async (cursor: string) => {
    const accountOffers = await horizon
      .offers("accounts", accountPubKey)
      .cursor(cursor)
      .limit(maxOffers)
      .call()

    if (JSON.stringify(accountOffers.records) !== JSON.stringify(subscriptionTarget.getLatest().offers)) {
      propagateUpdate({
        ...subscriptionTarget.getLatest(),
        loading: false,
        offers: accountOffers.records
      })
    }
    return accountOffers
  }

  const setup = async () => {
    try {
      subscribeToStream()
    } catch (error) {
      if (error.response && error.response.status === 404) {
        propagateUpdate({
          ...subscriptionTarget.getLatest(),
          loading: false
        })
        await waitForAccountData(horizon, accountPubKey)
        subscribeToStream()
      } else {
        throw error
      }
    }
  }

  setup().catch(trackError)

  return subscriptionTarget
}
