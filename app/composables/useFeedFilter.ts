export const useFeedFilter = () => {
  const activeTab = useState('feed-filter', () => 'latest')
  
  return {
    activeTab
  }
}
