/**
 * NexusFeed時代のimport pathを壊さないための互換エントリーポイントです。
 * 実体はChainBiteのItem用コンテナに移しています。
 */
export {
  ItemContainer as NewsContainer,
  type ItemContainerProps as NewsContainerProps,
} from './item-container'
