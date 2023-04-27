import { mapGetters } from 'vuex'
import commonAction from '@/utilsServices/commonAction'
import constant from '@/app-constants/constants'
import Dropdown from '@/components/Dropdown'
import DateTypeDropdown from '@/components/DateTypeDropdown'
import SearchFilter from '@/components/SearchFilter'
import BreadCrumbs from '@/components/BreadCrumbs'
import Pagination from '@/components/Pagination'
import Dialog from '@/components/Dialog'
import Toaster from '@/components/Toaster'
import noAccessibility from '../../../static/images/no-accessibility.png'

export default {
  name: 'listCampaign',
  data () {
    return {
      noAccessibility,
      titles: ['Promo Name', 'Type', 'Tag Label', 'Status', 'Period', 'Creator', 'Created date', 'Auto-approved'],
      content: [],
      sortableRows: [6],
      metadataInfo: {
        current: '',
        total: '',
        perPage: ''
      },
      statusLabel: 'All Status',
      statusOptionsList: ['All Status', 'Reviewing', 'Supervise', 'Waiting for Revision', 'Content Done', 'Merchant Registration', 'Review SKU',
        'Pending', 'Waiting For Approval', 'Approved', 'Teaser', 'Published', 'Live', 'Ended', 'Forced Stop', 'Failed'],
      creatorLabel: 'All Creators',
      creatorOptionsList: [],
      typeLabel: 'All Types',
      typeOptionsList: ['All Types', 'Flash sale', 'Regular', 'Special occasion'],
      showTeaserSwitch: true,
      stepsPlaceholder: [
        {value: 'Home', color: 'white-step'},
        {value: 'Campaign', color: 'blue-step'}
      ],
      createdSortOrder: 'DESCENDING',
      showMissingAssetPopup: false,
      popupTitles: ['Promo name', 'Status', 'Action'],
      popupContent: [],
      popupMetadata: {
        current: '',
        total: '',
        perPage: ''
      },
      noCampaignAccess: false
    }
  },
  computed: {
    ...mapGetters(['getForceStopSuccess', 'setForceStopSuccess', 'getDisplayPage', 'getFilterData',
      'getCampaignList', 'getListFilterApplied', 'getUserDetails', 'getAsyncApiCalls'])
  },
  mounted () {
    this.$store.commit('setDisplayPage', Object.assign({}, this.getDisplayPage, {'CampaignList': 1, 'MissingAssetList': 1}))
    this.$store.commit('setListFilterApplied', false)
    this.$store.commit('setFilterData', {
      campaignCode: '',
      campaignFilterOrders: [
        {
          filterField: 'CREATED_DATE',
          filterType: 'DESCENDING',
          filterSequence: 1
        }
      ],
      campaignName: '',
      campaignStatus: [],
      campaignType: null,
      countMerchantProducts: false,
      createdBy: [],
      createdDate: '',
      merchantCode: '',
      merchantNumRequired: false,
      pricePreviewEnabled: false,
      productNumRequired: false,
      promoEndTime: '',
      promoStartTime: '',
      autoApprovalEnabled: null
    })
    commonAction.isLoading(true)
    if (this.getUserDetails && this.getUserDetails.id) {
      this.apiCallOnloading()
    } else {
      this.getUserSession()
    }
  },
  methods: {
    apiCallOnloading () {
      if (commonAction.checkRoleWithAuthoritiesList('CAMP_VIEW_ACCESS')) {
        this.noCampaignAccess = false
        const apiCalls = {'apiCallsList': ['getCampaignList', 'getMissingAssetCampaignsList', 'getCreatorList']}
        this.$store.commit('setAsyncApiCalls', Object.assign({}, this.getAsyncApiCalls, apiCalls))
        this.getCampaignListProducts()
        this.getCreatorListApiCall()
        this.getMissingAssetApiCall()
      } else {
        this.noCampaignAccess = true
        commonAction.isLoading(false)
      }
    },
    getUserSession () {
      this.$store.dispatch('getUserDetails', {
        success: this.apiCallOnloading,
        failure: commonAction.redirectToLogout
      })
    },
    dateAndTimeConvertor (time) {
      return commonAction.timeStampConvertorWithLocalisation(time, true)
    },
    reverseMap (value, constantObj) {
      return Object.keys(constant[constantObj]).find(key => value === constant[constantObj][key])
    },
    isNotExistingFilter (value, variable) {
      const isFilterPresent = this.getFilterData[variable] && this.getFilterData[variable].length
      const isSameFilter = this.getFilterData[variable] && this.getFilterData[variable].includes(value)
      return (!value && isFilterPresent) || (value && !isSameFilter)
    },
    applyStatusFilter (itemInfo) {
      this.statusLabel = itemInfo
      const reverse = this.reverseMap(itemInfo, 'STATUS_MAP')
      let item = {}
      if (itemInfo === 'All Status') {
        item = {value: '', list: []}
      } else {
        item = {value: reverse, list: [reverse]}
      }
      if (this.isNotExistingFilter(item.value, 'campaignStatus')) {
        this.$store.commit('setFilterData', Object.assign({}, this.getFilterData, {'campaignStatus': item.list}))
        if (reverse === 'TEASER') {
          this.showTeaserSwitch = false
        } else {
          this.showTeaserSwitch = true
        }
        this.getCampaignListProducts('filter')
      }
    },
    applyCreatorFilter (itemInfo) {
      this.creatorLabel = itemInfo
      let item = {}
      if (itemInfo === 'All Creators') {
        item = {value: '', list: []}
      } else {
        item = {value: itemInfo, list: [itemInfo]}
      }
      if (this.isNotExistingFilter(item.value, 'createdBy')) {
        this.$store.commit('setFilterData', Object.assign({}, this.getFilterData, {'createdBy': item.list}))
        this.getCampaignListProducts('filter')
      }
    },
    applyPeriodDateFilter (startTimestamp, endTimestamp) {
      const startDate = this.setDateValue(startTimestamp) || ''
      const endDate = this.setDateValue(endTimestamp) || ''
      if (startDate !== this.getFilterData.promoStartTime || endDate !== this.getFilterData.promoEndTime) {
        this.$store.commit('setFilterData', Object.assign({}, this.getFilterData, {'promoStartTime': startDate, 'promoEndTime': endDate}))
        this.getCampaignListProducts('filter')
      }
    },
    setDateValue (timestamp) {
      let date = new Date(0).getTime()
      if (timestamp) {
        date = new Date(timestamp).setHours(0, 0, 0, 0)
      }
      return date
    },
    applyCreatedDateFilter (timestamp) {
      const date = this.setDateValue(timestamp) || ''
      if (date !== this.getFilterData.createdDate) {
        this.$store.commit('setFilterData', Object.assign({}, this.getFilterData, {'createdDate': date}))
        this.getCampaignListProducts('filter')
      }
    },
    applySortFilter (fieldNameObj) {
      let filterType = ''
      if (fieldNameObj.typeSort === 'asc') {
        filterType = 'ASCENDING'
      } else {
        filterType = 'DESCENDING'
      }
      this.createdSortOrder = filterType
      const campaignFilterOrders = [{
        filterType,
        filterField: 'CREATED_DATE',
        filterSequence: 1
      }]
      this.$store.commit('setFilterData', Object.assign({}, this.getFilterData, {campaignFilterOrders}))
      this.getCampaignListProducts('filter')
    },
    applyTypeFilter (itemInfo) {
      this.typeLabel = itemInfo
      const reverse = this.reverseMap(itemInfo, 'TYPE_MAP')
      let item
      if (itemInfo === 'All Types') {
        item = ''
      } else {
        item = reverse
      }
      if (item === 'SPECIAL_OCCASION') {
        this.$store.commit('setFilterData', Object.assign({}, this.getFilterData, {'campaignType': 'REGULAR', 'exclusive': true}))
      } else if (item === 'REGULAR') {
        this.$store.commit('setFilterData', Object.assign({}, this.getFilterData, {'campaignType': item, 'exclusive': false}))
      } else {
        this.$store.commit('setFilterData', Object.assign({}, this.getFilterData, {'campaignType': item, 'exclusive': null}))
      }
      this.getCampaignListProducts('filter')
    },
    applyPriceTeaserFilter (data) {
      this.$store.commit('setFilterData', Object.assign({}, this.getFilterData, {'pricePreviewEnabled': data}))
      this.getCampaignListProducts('filter')
    },
    applySearchFilter (data) {
      if (this.getFilterData.campaignName !== data) {
        this.$store.commit('setFilterData', Object.assign({}, this.getFilterData, {'campaignKeyword': data}))
        this.getCampaignListProducts('filter')
      }
    },
    getCampaignType (type) {
      let typeValue = type
      if (type) {
        if (type.includes('_')) {
          typeValue = type.replace('_', ' ')
        }
        return typeValue.charAt(0).toUpperCase() + typeValue.slice(1).toLowerCase()
      }
      return typeValue
    },
    toggleMissingAssetPopup () {
      this.showMissingAssetPopup = !this.showMissingAssetPopup
      setTimeout(() => {
        this.addScrollFunctionality(document.getElementsByClassName('blu-table')[0])
      }, 100)
    },
    addScrollFunctionality (tableId) {
      tableId.addEventListener('scroll', function () {
        const totalPages = Math.ceil(this.popupMetadata.total / this.popupMetadata.perPage)
        if (tableId.scrollTop + tableId.clientHeight >= tableId.scrollHeight - 1 && this.popupMetadata.current + 1 <= totalPages) {
          this.loadMoreBlibliAssets()
        }
      }.bind(this))
    },
    getCampaignDetailUrl (code) {
      this.$router.push({path: `/campaign-center-ui/detail/${code}`})
    },
    getCampaignListProducts (data = '') {
      commonAction.isLoading(true)
      if (data) {
        this.$store.commit('setDisplayPage', Object.assign({}, this.getDisplayPage, {'CampaignList': 1}))
        this.$store.commit('setListFilterApplied', true)
      }
      const requestData = {
        'metadata': {
          page: this.getDisplayPage['CampaignList'],
          size: 10
        },
        data: {}
      }
      requestData.data = Object.assign({}, requestData.data, this.getFilterData)
      this.$store.dispatch('getCampaignList', {
        request: requestData,
        success: this.successGetCampaignList,
        failure: this.errorApiFailure
      })
    },
    successGetCampaignList (response) {
      this.checkIfAllApiCallsResolved('getCampaignList')
      window.scrollTo(0, 0)
      this.content = []
      response.content.forEach(campaign => {
        const campaignObj = {}
        campaignObj['campaignNameAndCode'] = {
          'campaignName': campaign.campaignName,
          'campaignCode': campaign.campaignCode
        }
        campaignObj['campaignType'] = this.getCampaignType(campaign.campaignType)
        campaignObj['tagLabel'] = campaign.tagLabel
        campaignObj['campaignStatus'] = constant['STATUS_MAP'][campaign.campaignStatus]
        campaignObj['dates'] = {
          'promoStartTime': campaign.promoStartTime,
          'promoEndTime': campaign.promoEndTime,
          'teaserPeriod': campaign.teaserPeriod,
          'teaserStartTime': campaign.teaserStartTime,
          'teaserEndTime': campaign.teaserEndTime
        }
        campaignObj['createdBy'] = campaign.createdBy
        campaignObj['createdDate'] = campaign.createdDate
        campaignObj['autoApprovalEnabled'] = campaign.autoApprovalEnabled
        this.content.push(campaignObj)
      })
      this.metadataInfo.total = response.pageMetaData.totalRecords
      this.metadataInfo.current = response.pageMetaData.pageNumber + 1
      this.metadataInfo.perPage = response.pageMetaData.pageSize
    },
    pageChanged (pageNo) {
      this.$store.commit('setDisplayPage', Object.assign({}, this.getDisplayPage, {'CampaignList': pageNo}))
      this.getCampaignListProducts()
    },
    getMissingAssetApiCall () {
      commonAction.isLoading(true)
      const requestData = {
        metadata: {
          page: this.getDisplayPage['MissingAssetList'],
          size: 10
        }
      }
      this.$store.dispatch('getMissingAssetCampaignsList', {
        request: requestData,
        success: this.successGetMissingAsset,
        failure: this.errorApiFailure
      })
    },
    successGetMissingAsset (response) {
      this.checkIfAllApiCallsResolved('getMissingAssetCampaignsList')
      if (response.pageMetaData.pageNumber === 0) {
        this.popupContent = []
      }
      response.content.forEach(campaign => {
        const campaignObj = {}
        campaignObj['campaignName'] = campaign.campaignName
        campaignObj['campaignStatus'] = constant.STATUS_MAP[campaign.campaignStatus]
        campaignObj['action'] = campaign.campaignCode
        this.popupContent.push(campaignObj)
      })
      this.popupMetadata.total = response.pageMetaData.totalRecords
      this.popupMetadata.current = response.pageMetaData.pageNumber + 1
      this.popupMetadata.perPage = response.pageMetaData.pageSize
    },
    loadMoreBlibliAssets () {
      this.$store.commit('setDisplayPage', Object.assign({}, this.getDisplayPage, {'MissingAssetList': this.popupMetadata.current + 1}))
      this.getMissingAssetApiCall()
    },
    getCreatorListApiCall () {
      commonAction.isLoading(true)
      this.$store.dispatch('getCreatorList', {
        success: this.successGetCreatorList,
        failure: this.errorApiFailure
      })
    },
    successGetCreatorList (response) {
      this.checkIfAllApiCallsResolved('getCreatorList')
      this.creatorOptionsList = ['All Creators'].concat(response.value.usernameList)
    },
    errorApiFailure (error, variable) {
      commonAction.apiFailure(error, variable)
    },
    checkIfAllApiCallsResolved (apiCall = '') {
      if (commonAction.checkIfAllApiCallsResolved(apiCall)) {
        commonAction.isLoading(false)
      }
    }
  },
  components: {
    Dropdown,
    DateTypeDropdown,
    SearchFilter,
    BreadCrumbs,
    Pagination,
    Dialog,
    Toaster
  }
}
