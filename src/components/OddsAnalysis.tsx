import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../utils/supabaseClient'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Checkbox } from './ui/checkbox'
import { Slider } from './ui/slider'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine, Line, ComposedChart } from 'recharts'
import { ArrowRight, TrendingUp, X } from 'lucide-react'
import { TeamCombobox } from './TeamCombobox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'

interface MatchData {
  team: string
  match_date: string
  opponent: string
  is_home: boolean
  shots_for: number
  shots_against: number
  shots_on_target_for: number
  shots_on_target_against: number
  corners_for: number
  corners_against: number
  goals_for: number
  goals_against: number
  yellow_for: number
  yellow_against: number
  red_for: number
  red_against: number
  [key: string]: any
}

interface ChartData {
  match_date?: string
  match_index?: number
  opponent?: string
  value: number
  originalValue?: number
  isSmoothed?: boolean
  movingAverage?: number
  averageAgainst?: number
  overallAverage?: number
}

interface LeagueAverages {
  id: number
  season: string
  league: string
  stat_type: string
  home_average: number
  away_average: number
  league_average: number
  total_matches: number
  last_updated: string
}

type StatCategory = 'shots' | 'shots_on_target' | 'corners' | 'goals' | 'yellow' | 'red'
type DisplayOption = 'forA' | 'againstA' | 'combined'

const CustomBarLabel = ({ x, y, width, height, value, payload }: { x: number; y: number; width: number; height: number; value: number; payload?: any }) => {
  if (value === 0 || value === null || value === undefined) return null
  
  const isSmoothed = payload?.isSmoothed || false
  
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill={isSmoothed ? "#f97316" : "white"}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize="12"
      fontWeight="500"
      style={{ 
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 1000
      }}
    >
      {value}
    </text>
  )
}

export function OddsAnalysis() {
  const [teams, setTeams] = useState<string[]>([])
  const [selectedLeague, setSelectedLeague] = useState<string>('')
  const [selectedTeamA, setSelectedTeamA] = useState<string>('')
  const [selectedTeamB, setSelectedTeamB] = useState<string>('')
  const [teamAData, setTeamAData] = useState<MatchData[]>([])
  const [teamBData, setTeamBData] = useState<MatchData[]>([])
  const [numberOfMatches, setNumberOfMatches] = useState<number[]>([24])
  const [lineValue, setLineValue] = useState<number[]>([12.5])
  const [homeAwayFilter, setHomeAwayFilter] = useState<string>('home-away')
  const [leagueAverages, setLeagueAverages] = useState<LeagueAverages[]>([])
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  
  const handleLineValueChange = (value: number[]) => {
    const transformedValue = value[0] + 0.5
    setLineValue([transformedValue])
  }
  
  const getSliderValue = () => {
    return [lineValue[0] - 0.5]
  }
  
  const [statCategory, setStatCategory] = useState<StatCategory>('shots')
  const [displayOption, setDisplayOption] = useState<DisplayOption>('forA')
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(false)
  const [showAverageAgainst, setShowAverageAgainst] = useState<boolean>(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [averageAgainstData, setAverageAgainstData] = useState<{[key: string]: number}>({})
  const [useCustomTeamBMatches, setUseCustomTeamBMatches] = useState<boolean>(false)
  const [teamBMatches, setTeamBMatches] = useState<number[]>([24])
  const [useOutlierSmoothing, setUseOutlierSmoothing] = useState<boolean>(false)
  const [smoothingStrength, setSmoothingStrength] = useState<number[]>([2])
  const [excludedMatches, setExcludedMatches] = useState<Set<string>>(new Set())

  const leagues = ["Premier League", "La Liga", "Bundesliga", "Serie A", "Serie B", "Championship"]

  useEffect(() => {
    if (!selectedLeague) {
      setAvailableSeasons([])
      setSelectedSeason('')
      setTeams([])
      setSelectedTeamA('')
      setSelectedTeamB('')
      setLeagueAverages([])
      return
    }

    async function fetchAvailableSeasons() {
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('team_stats')
        .select('season')
        .eq('league', selectedLeague)

      if (seasonsError) {
        console.error('Error fetching seasons:', seasonsError)
        return
      }

      const uniqueSeasons = [...new Set(seasonsData?.map(r => r.season))].sort().reverse()
      setAvailableSeasons(uniqueSeasons)
      setSelectedSeason('all')

      // DEBUG: Log Championship seasons
      if (selectedLeague === 'Championship') {
        console.log('=== CHAMPIONSHIP SEASONS ===')
        console.log('Available seasons:', uniqueSeasons)
        console.log('Total seasons:', uniqueSeasons.length)
        console.log('============================')
      }
    }

    fetchAvailableSeasons()
  }, [selectedLeague])

  useEffect(() => {
    if (!selectedLeague) {
      setTeams([])
      setSelectedTeamA('')
      setSelectedTeamB('')
      setLeagueAverages([])
      return
    }

    async function fetchTeamsAndAverages() {
      let teamsQuery = supabase
        .from('team_stats')
        .select('team')
        .eq('league', selectedLeague)

      if (selectedSeason && selectedSeason !== 'all') {
        teamsQuery = teamsQuery.eq('season', selectedSeason)
      }

      const { data: teamsData, error: teamsError } = await teamsQuery

      if (teamsError) {
        console.error('Error fetching teams:', teamsError)
        return
      }

      const uniqueTeams = [...new Set(teamsData?.map(r => r.team))]
      setTeams(uniqueTeams)

      // Always fetch league averages with season='all' since averages are now calculated across all matches
      const { data: avgData, error: avgError } = await supabase
        .from('league_averages')
        .select('*')
        .eq('league', selectedLeague)
        .eq('season', 'all')

      if (avgError) {
        console.error('Error fetching league averages:', avgError)
        setLeagueAverages([])
      } else {
        setLeagueAverages(avgData || [])
      }

      // DEBUG: Log Championship data
      if (selectedLeague === 'Championship') {
        console.log('=== CHAMPIONSHIP DEBUG INFO ===')
        console.log('📊 Teams found:', uniqueTeams.length)
        console.log('Teams:', uniqueTeams)
        console.log('📈 League averages found:', avgData?.length || 0)
        console.log('League averages data:', avgData)
        console.log('🔍 Selected season:', selectedSeason)
        console.log('================================')
      }
    }

    fetchTeamsAndAverages()
  }, [selectedLeague, selectedSeason])

  useEffect(() => {
    if (!showAverageAgainst || displayOption === 'combined' || !teamAData.length) {
      setAverageAgainstData({})
      return
    }

    const fetchAvgAgainstData = async () => {
      if (displayOption === 'againstA') {
        setAverageAgainstData({})
        return
      }

      const opponents = teamAData.slice(0, numberOfMatches[0]).map(match => match.opponent).filter(Boolean)
      const uniqueOpponents = [...new Set(opponents)]
      
      if (uniqueOpponents.length > 0) {
        try {
          // Fetch team averages against (no season column in this table - it contains all-time averages)
          const { data, error } = await supabase
            .from('team_averages_against')
            .select('team, avg_against')
            .eq('stat_type', statCategory)
            .in('team', uniqueOpponents)

          if (error) {
            console.error('Error fetching average against data:', error)
            setAverageAgainstData({})
            return
          }

          const lookupMap: {[key: string]: number} = {}
          data?.forEach(row => {
            lookupMap[row.team] = row.avg_against || 0
          })

          const missingOpponents = uniqueOpponents.filter(opponent => !lookupMap[opponent])
          
          if (missingOpponents.length > 0) {
            let statsQuery = supabase
              .from('team_stats')
              .select(`team, ${statCategory}_against`)
              .in('team', missingOpponents)

            if (selectedSeason && selectedSeason !== 'all') {
              statsQuery = statsQuery.eq('season', selectedSeason)
            }

            const { data: statsData, error: statsError } = await statsQuery

            if (!statsError && statsData && statsData.length > 0) {
              missingOpponents.forEach(opponent => {
                const opponentMatches = statsData.filter(match => match.team === opponent)
                if (opponentMatches.length > 0) {
                  const statAgainstField = `${statCategory}_against`
                  const total = opponentMatches.reduce((sum, match) => sum + (match[statAgainstField] || 0), 0)
                  const average = total / opponentMatches.length
                  lookupMap[opponent] = parseFloat(average.toFixed(1))
                }
              })
            } else {
              const leagueAvgRow = leagueAverages.find(row => row.stat_type === statCategory)
              const fallbackValue = leagueAvgRow?.league_average || 0
              
              missingOpponents.forEach(opponent => {
                if (!lookupMap[opponent]) {
                  lookupMap[opponent] = fallbackValue
                }
              })
            }
          }

          setAverageAgainstData(lookupMap)

          // DEBUG: Log Championship averages against data
          if (selectedLeague === 'Championship') {
            console.log('=== CHAMPIONSHIP AVG AGAINST DATA ===')
            console.log('📊 Stat category:', statCategory)
            console.log('Opponents:', uniqueOpponents)
            console.log('Averages against from DB:', data?.length || 0)
            console.log('Missing opponents:', missingOpponents)
            console.log('Final lookup map:', lookupMap)
            console.log('======================================')
          }
        } catch (error) {
          console.error('Error in fetchAverageAgainstData:', error)
          setAverageAgainstData({})
        }
      }
    }

    fetchAvgAgainstData()
  }, [showAverageAgainst, displayOption, teamAData, numberOfMatches, statCategory, selectedSeason, leagueAverages])

  useEffect(() => {
    if (!selectedTeamA || !selectedTeamB) {
      setTeamAData([])
      setTeamBData([])
      return
    }

    async function fetchMatches() {
      let queryA = supabase
        .from('team_stats')
        .select('*')
        .eq('team', selectedTeamA)

      if (selectedSeason && selectedSeason !== 'all') {
        queryA = queryA.eq('season', selectedSeason)
      }

      queryA = queryA.order('match_date', { ascending: false }).limit(30)

      let queryB = supabase
        .from('team_stats')
        .select('*')
        .eq('team', selectedTeamB)

      if (selectedSeason && selectedSeason !== 'all') {
        queryB = queryB.eq('season', selectedSeason)
      }

      queryB = queryB.order('match_date', { ascending: false }).limit(30)

      const [{ data: dataA, error: teamAError }, { data: dataB, error: teamBError }] = await Promise.all([
        queryA,
        queryB
      ])

      if (teamAError) {
        console.error('Error fetching Team A matches:', teamAError)
        setTeamAData([])
      } else {
        setTeamAData(dataA || [])
      }

      if (teamBError) {
        console.error('Error fetching Team B matches:', teamBError)
        setTeamBData([])
      } else {
        setTeamBData(dataB || [])
      }

      // DEBUG: Log Championship match data
      if (selectedLeague === 'Championship') {
        console.log('=== CHAMPIONSHIP MATCH DATA ===')
        console.log('🏟️ Team A:', selectedTeamA)
        console.log('Team A matches found:', dataA?.length || 0)
        if (dataA && dataA.length > 0) {
          console.log('Sample Team A match:', dataA[0])
        }
        console.log('🏟️ Team B:', selectedTeamB)
        console.log('Team B matches found:', dataB?.length || 0)
        if (dataB && dataB.length > 0) {
          console.log('Sample Team B match:', dataB[0])
        }
        console.log('================================')
      }
    }

    fetchMatches()
  }, [selectedTeamA, selectedTeamB, selectedSeason])

  const filterMatches = useMemo(() => {
    return (matches: MatchData[]) => {
      if (homeAwayFilter === 'home') {
        return matches.filter(match => match.is_home === true)
      } else if (homeAwayFilter === 'away') {
        return matches.filter(match => match.is_home === false)
      }
      return matches
    }
  }, [homeAwayFilter])

  // Get available matches for exclusion (only from current chart data)
  const getAvailableMatches = useMemo(() => {
    if (!teamAData.length) return []
    
    // First: Get latest N matches, THEN filter by home/away
    const latestMatches = teamAData
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
      .slice(0, numberOfMatches[0])
    
    const filtered = filterMatches(latestMatches)
      .filter(match => {
        const matchId = `${match.match_date}_${match.opponent}`
        return !excludedMatches.has(matchId)
      })
    
    return filtered.map(match => ({
      id: `${match.match_date}_${match.opponent}`,
      label: `${new Date(match.match_date).toLocaleDateString('sv-SE')} vs ${match.opponent}`,
      date: match.match_date,
      opponent: match.opponent
    }))
  }, [teamAData, numberOfMatches, homeAwayFilter, excludedMatches])

  const handleExcludeMatch = (matchId: string) => {
    setExcludedMatches(prev => new Set([...prev, matchId]))
  }

  const handleIncludeMatch = (matchId: string) => {
    setExcludedMatches(prev => {
      const newSet = new Set(prev)
      newSet.delete(matchId)
      return newSet
    })
  }

  const getExcludedMatchesDisplay = useMemo(() => {
    if (!teamAData.length || excludedMatches.size === 0) return []
    
    return Array.from(excludedMatches).map(matchId => {
      const [date, opponent] = matchId.split('_')
      return {
        id: matchId,
        label: `${new Date(date).toLocaleDateString('sv-SE')} vs ${opponent}`
      }
    })
  }, [excludedMatches, teamAData])

  const buildChartSeries = (
    matchesA: MatchData[], 
    matchesB: MatchData[], 
    statCategory: StatCategory, 
    displayOption: DisplayOption, 
    N: number
  ): ChartData[] => {
    // First: Get the latest N matches (sorted by date)
    const latestMatchesA = matchesA
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
      .slice(0, N)
    
    // Then: Apply home/away filter and exclude matches
    const sortedMatchesA = filterMatches(latestMatchesA).filter(match => {
      const matchId = `${match.match_date}_${match.opponent}`
      return !excludedMatches.has(matchId)
    })
    
    // Same for Team B: first get latest N, then filter
    const latestMatchesB = matchesB
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
      .slice(0, N)
    
    const sortedMatchesB = filterMatches(latestMatchesB)

    let series: ChartData[] = []

    switch (displayOption) {
      case 'forA':
        series = sortedMatchesA.map(match => ({
          match_date: match.match_date,
          opponent: match.opponent || 'Unknown',
          value: match[`${statCategory}_for`] || 0
        }))
        break

      case 'againstA':
        series = sortedMatchesA.map(match => ({
          match_date: match.match_date,
          opponent: match.opponent || 'Unknown',
          value: match[`${statCategory}_against`] || 0
        }))
        break

      case 'combined':
        series = sortedMatchesA.map(match => ({
          match_date: match.match_date,
          opponent: match.opponent || 'Unknown',
          value: (match[`${statCategory}_for`] || 0) + (match[`${statCategory}_against`] || 0)
        }))
        break
    }

    // Don't pad with empty data - just return what we have
    // This prevents empty bars when home/away filtering reduces the dataset
    return series.reverse()
  }

  const calculateMovingAverage = (data: ChartData[], windowSize: number = 5): ChartData[] => {
    return data.map((item, index) => {
      const start = Math.max(0, index - windowSize + 1)
      const slice = data.slice(start, index + 1)
      const average = slice.reduce((sum, d) => sum + d.value, 0) / slice.length
      return {
        ...item,
        movingAverage: parseFloat(average.toFixed(1))
      }
    })
  }

  const applyOutlierSmoothing = (data: ChartData[]): ChartData[] => {
    if (!useOutlierSmoothing || data.length === 0) {
      return data.map(item => ({ ...item, isSmoothed: false }))
    }

    const values = data.map(d => d.value)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)
    
    let factor = 2
    if (smoothingStrength[0] === 1) factor = 3
    if (smoothingStrength[0] === 2) factor = 2
    if (smoothingStrength[0] === 3) factor = 1.5
    
    const threshold = factor * stdDev

    return data.map(d => {
      if (Math.abs(d.value - mean) > threshold) {
        const newVal = (d.value + mean) / 2
        return { 
          ...d, 
          value: parseFloat(newVal.toFixed(1)), 
          originalValue: d.value,
          isSmoothed: true 
        }
      }
      return { ...d, originalValue: d.value, isSmoothed: false }
    })
  }

  const prepareChartData = (): ChartData[] => {
    if (!teamAData.length) {
      return []
    }

    let baseData = buildChartSeries(teamAData, teamBData, statCategory, displayOption, numberOfMatches[0])
    baseData = applyOutlierSmoothing(baseData)
    baseData = calculateMovingAverage(baseData)
    
    if (displayOption === 'againstA') {
      baseData = baseData.map((item, index) => {
        const start = Math.max(0, index - 4)
        const slice = baseData.slice(start, index + 1)
        const average = slice.reduce((sum, d) => sum + d.value, 0) / slice.length
        return {
          ...item,
          averageAgainst: parseFloat(average.toFixed(1))
        }
      })
    } else if (displayOption === 'forA') {
      baseData = baseData.map(item => ({
        ...item,
        averageAgainst: item.opponent ? (averageAgainstData[item.opponent] || 0) : 0
      }))
    }
    
    return baseData
  }

  const chartData = useMemo(() => {
    return prepareChartData()
  }, [teamAData, teamBData, statCategory, displayOption, numberOfMatches, averageAgainstData, homeAwayFilter, useOutlierSmoothing, smoothingStrength, excludedMatches])

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const statLabel = statCategory === 'shots' ? 'shots' : 
                       statCategory === 'shots_on_target' ? 'shots on target' :
                       statCategory === 'corners' ? 'corners' :
                       statCategory === 'goals' ? 'goals' :
                       statCategory === 'yellow' ? 'yellow cards' : 'red cards'
      
      const isSmoothed = data.isSmoothed && data.originalValue !== undefined
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          {displayOption === 'combined' ? (
            <>
              <p className="font-medium text-foreground">{data.match_date ? new Date(data.match_date).toLocaleDateString() : 'Match'}</p>
              <p className="text-sm text-foreground">{`${selectedTeamA} vs ${data.opponent}`}</p>
              <p className="text-sm text-foreground">{`Total ${statLabel} in match: ${payload[0].value}`}</p>
              {isSmoothed && (
                <div className="mt-1 pt-1 border-t border-border/50">
                  <p className="text-xs text-orange-400">Adjusted from {data.originalValue} → {payload[0].value} (smoothing level {smoothingStrength[0]})</p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="font-medium text-foreground">{data.match_date ? new Date(data.match_date).toLocaleDateString() : 'Match'}</p>
              <p className="text-sm text-foreground">
                {displayOption === 'forA' 
                  ? `${selectedTeamA} vs ${data.opponent}`
                  : `${data.opponent} vs ${selectedTeamA}`
                }
              </p>
              <p className="text-sm text-foreground">
                {displayOption === 'forA' 
                  ? `${selectedTeamA} ${statLabel}: ${payload[0].value}`
                  : `${statLabel} against ${selectedTeamA}: ${payload[0].value}`
                }
              </p>
              {isSmoothed && (
                <div className="mt-1 pt-1 border-t border-border/50">
                  <p className="text-xs text-orange-400">Adjusted from {data.originalValue} → {payload[0].value} (smoothing level {smoothingStrength[0]})</p>
                </div>
              )}
            </>
          )}
        </div>
      )
    }
    return null
  }

  const getBarColor = useMemo(() => {
    return (value?: number) => {
      if (displayOption === 'forA' || displayOption === 'againstA') {
        if (value !== undefined) {
          return value >= lineValue[0] ? '#22c55e' : '#ef4444'
        }
        return '#22c55e'
      }
      if (displayOption === 'combined') {
        if (value !== undefined) {
          return value >= lineValue[0] ? '#22c55e' : '#ef4444'
        }
        return '#3b82f6'
      }
      return '#22c55e'
    }
  }, [displayOption, lineValue])

  const CustomBar = useMemo(() => {
    return ({ fill, index, payload, ...rest }: { fill: string; index: number; payload: any; [key: string]: any }) => {
      const isHovered = hoveredIndex === index
      const value = payload?.value
      const baseColor = getBarColor(value)
      
      const getBrighterColor = (color: string) => {
        switch (color) {
          case '#22c55e': return '#34d573'
          case '#ef4444': return '#f87171'
          case '#3b82f6': return '#60a5fa'
          default: return color
        }
      }
      
      const { 
        movingAverage, 
        averageAgainst, 
        overallAverage, 
        tooltipPosition, 
        parentViewBox, 
        dataKey,
        match_date,
        match_index,
        opponent,
        isSmoothed,
        originalValue,
        value: _value,
        ...domProps 
      } = rest
      
      return (
        <rect
          {...domProps}
          fill={isHovered ? getBrighterColor(baseColor) : baseColor}
          style={{ 
            transition: 'fill 0.2s ease',
            cursor: 'pointer'
          }}
          rx={4}
          ry={4}
        />
      )
    }
  }, [hoveredIndex, getBarColor])

  const getChartTitle = () => {
    const statLabel = statCategory === 'shots' ? 'Shots' : 
                     statCategory === 'shots_on_target' ? 'Shots on Target' :
                     statCategory === 'corners' ? 'Corners' :
                     statCategory === 'goals' ? 'Goals' :
                     statCategory === 'yellow' ? 'Yellow Cards' : 'Red Cards'
    
    switch (displayOption) {
      case 'forA':
        return `${selectedTeamA} - ${statLabel} Analysis`
      case 'againstA':
        return `${selectedTeamA} - ${statLabel} Conceded Analysis`
      case 'combined':
        return `${selectedTeamA} - Total ${statLabel} per Match`
      default:
        return `${statLabel} Analysis`
    }
  }

  const getReferenceLineMax = () => {
    // Different max values for combined vs individual display options
    if (displayOption === 'combined') {
      switch (statCategory) {
        case 'goals':
          return 10
        case 'shots':
          return 35
        case 'shots_on_target':
          return 20
        case 'corners':
          return 25
        case 'yellow':
          return 12
        case 'red':
          return 6
        default:
          return 35
      }
    } else {
      // For "forA" and "againstA" display options
      switch (statCategory) {
        case 'goals':
          return 6
        case 'shots':
          return 26
        case 'shots_on_target':
          return 12
        case 'corners':
          return 15
        case 'yellow':
          return 8
        case 'red':
          return 4
        default:
          return 26
      }
    }
  }

  const getStatLabel = () => {
    switch (statCategory) {
      case 'shots':
        return 'Shots'
      case 'shots_on_target':
        return 'Shots on Target'
      case 'corners':
        return 'Corners'
      case 'goals':
        return 'Goals'
      case 'yellow':
        return 'Yellow Cards'
      case 'red':
        return 'Red Cards'
      default:
        return 'Stats'
    }
  }

  const getReferenceLineDescription = () => {
    const statLabel = getStatLabel().toLowerCase()
    switch (displayOption) {
      case 'forA':
        return `Reference threshold for ${statLabel}`
      case 'againstA':
        return `Threshold for ${statLabel} conceded`
      case 'combinedAB':
        return `Combined ${statLabel} threshold`
      default:
        return `Reference threshold for ${statLabel}`
    }
  }

  const actualMovingAverage = useMemo(() => {
    if (chartData.length === 0) return 0
    const sum = chartData.reduce((acc, d) => acc + d.value, 0)
    return parseFloat((sum / chartData.length).toFixed(1))
  }, [chartData])

  const factorial = useMemo(() => {
    const cache: number[] = [1, 1]
    return (n: number): number => {
      if (cache[n] !== undefined) return cache[n]
      for (let i = cache.length; i <= n; i++) {
        cache[i] = cache[i - 1] * i
      }
      return cache[n]
    }
  }, [])

  const poissonProbability = (lambda: number, k: number): number => {
    if (lambda <= 0) return 0
    return Math.pow(lambda, k) * Math.exp(-lambda) / factorial(k)
  }

  const poissonOverProbability = (lambda: number, threshold: number): number => {
    if (lambda <= 0) return 0
    
    let cumulativeProbability = 0
    for (let k = 0; k <= Math.floor(threshold); k++) {
      cumulativeProbability += poissonProbability(lambda, k)
    }
    return Math.max(0, Math.min(1, 1 - cumulativeProbability))
  }

  const probabilityToOdds = (probability: number): number => {
    if (probability <= 0 || probability < 0.001) return 999.00
    if (probability >= 1) return 1.00
    return parseFloat((1 / probability).toFixed(2))
  }

  const calculateTrueOdds = () => {
    if (!selectedTeamA || !selectedTeamB || leagueAverages.length === 0 || teamAData.length === 0 || teamBData.length === 0) {
      // DEBUG: Log why odds calculation failed for Championship
      if (selectedLeague === 'Championship') {
        console.log('=== CHAMPIONSHIP ODDS CALC FAILED ===')
        console.log('selectedTeamA:', selectedTeamA)
        console.log('selectedTeamB:', selectedTeamB)
        console.log('leagueAverages length:', leagueAverages.length)
        console.log('teamAData length:', teamAData.length)
        console.log('teamBData length:', teamBData.length)
        console.log('=====================================')
      }
      return { overOdds: 0, underOdds: 0, expectedValue: 0 }
    }

    const filterMatches = (matches: MatchData[]) => {
      if (homeAwayFilter === 'home') {
        return matches.filter(match => match.is_home === true)
      } else if (homeAwayFilter === 'away') {
        return matches.filter(match => match.is_home === false)
      }
      return matches
    }

    // First: Get the latest N matches (sorted by date), THEN filter by home/away
    const latestTeamAMatches = teamAData
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
      .slice(0, numberOfMatches[0])
    const filteredTeamAMatches = filterMatches(latestTeamAMatches)
    
    const teamBMatchCount = useCustomTeamBMatches ? teamBMatches[0] : numberOfMatches[0]
    const latestTeamBMatches = teamBData
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
      .slice(0, teamBMatchCount)
    const filteredTeamBMatches = filterMatches(latestTeamBMatches)
    
    if (filteredTeamAMatches.length === 0 || filteredTeamBMatches.length === 0) {
      return { overOdds: 0, underOdds: 0, expectedValue: 0 }
    }

    const getSmoothedValues = (matches: MatchData[], field: string): number[] => {
      if (!useOutlierSmoothing) {
        return matches.map(match => match[field] || 0)
      }

      const values = matches.map(match => match[field] || 0)
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      const stdDev = Math.sqrt(variance)
      
      let factor = 2
      if (smoothingStrength[0] === 1) factor = 3
      if (smoothingStrength[0] === 2) factor = 2
      if (smoothingStrength[0] === 3) factor = 1.5
      
      const threshold = factor * stdDev

      return values.map(value => {
        if (Math.abs(value - mean) > threshold) {
          return (value + mean) / 2
        }
        return value
      })
    }

    let teamAAvg = 0
    let teamBAvgAgainst = 0

    const statField = `${statCategory}_for`
    const statAgainstField = `${statCategory}_against`

    if (displayOption === 'forA') {
      const teamAValues = getSmoothedValues(filteredTeamAMatches, statField)
      teamAAvg = teamAValues.reduce((sum, val) => sum + val, 0) / teamAValues.length
      
      const teamBValues = getSmoothedValues(filteredTeamBMatches, statAgainstField)
      teamBAvgAgainst = teamBValues.reduce((sum, val) => sum + val, 0) / teamBValues.length
    } else if (displayOption === 'againstA') {
      const teamAValues = getSmoothedValues(filteredTeamAMatches, statAgainstField)
      teamAAvg = teamAValues.reduce((sum, val) => sum + val, 0) / teamAValues.length
      
      const teamBValues = getSmoothedValues(filteredTeamBMatches, statField)
      teamBAvgAgainst = teamBValues.reduce((sum, val) => sum + val, 0) / teamBValues.length
    } else {
      const teamAForValues = getSmoothedValues(filteredTeamAMatches, statField)
      const teamAAgainstValues = getSmoothedValues(filteredTeamAMatches, statAgainstField)
      const teamATotalAvg = filteredTeamAMatches.reduce((sum, match, index) => {
        return sum + teamAForValues[index] + teamAAgainstValues[index]
      }, 0) / filteredTeamAMatches.length
      
      const teamBForValues = getSmoothedValues(filteredTeamBMatches, statField)
      const teamBAgainstValues = getSmoothedValues(filteredTeamBMatches, statAgainstField)
      const teamBTotalAvg = filteredTeamBMatches.reduce((sum, match, index) => {
        return sum + teamBForValues[index] + teamBAgainstValues[index]
      }, 0) / filteredTeamBMatches.length
      
      const leagueAvgRow = leagueAverages.find(row => row.stat_type === statCategory)
      // Use the appropriate league average based on home/away filter
      let weightedAvg = 0
      let usedColumn = ''
      if (homeAwayFilter === 'home') {
        weightedAvg = leagueAvgRow?.home_average || 0
        usedColumn = 'home_average'
      } else if (homeAwayFilter === 'away') {
        weightedAvg = leagueAvgRow?.away_average || 0
        usedColumn = 'away_average'
      } else {
        weightedAvg = leagueAvgRow?.league_average || 0
        usedColumn = 'league_average'
      }
      
      // DEBUG: Log which league average column is being used (Combined mode)
      console.log('🎯 LEAGUE AVERAGE DEBUG (COMBINED)')
      console.log('Home/Away Filter:', homeAwayFilter)
      console.log('Using Column:', usedColumn)
      console.log('Value Retrieved:', weightedAvg)
      console.log('Stat Category:', statCategory)
      console.log('Full Row Data:', leagueAvgRow)
      console.log('------------------------')
      
      if (!weightedAvg || weightedAvg === 0) {
        return { overOdds: 0, underOdds: 0, expectedValue: 0 }
      }
      
      const expectedValue = (teamATotalAvg * teamBTotalAvg) / (weightedAvg * 2)
      const overProbability = poissonOverProbability(expectedValue, lineValue[0])
      const overOdds = probabilityToOdds(overProbability)
      const underOdds = probabilityToOdds(1 - overProbability)
      
      return { overOdds, underOdds, expectedValue: parseFloat(expectedValue.toFixed(2)) }
    }

    const leagueAvgRow = leagueAverages.find(row => row.stat_type === statCategory)
    // Use the appropriate league average based on home/away filter
    let weightedAvg = 0
    let usedColumn = ''
    if (homeAwayFilter === 'home') {
      weightedAvg = leagueAvgRow?.home_average || 0
      usedColumn = 'home_average'
    } else if (homeAwayFilter === 'away') {
      weightedAvg = leagueAvgRow?.away_average || 0
      usedColumn = 'away_average'
    } else {
      weightedAvg = leagueAvgRow?.league_average || 0
      usedColumn = 'league_average'
    }
    
    // DEBUG: Log which league average column is being used
    console.log('🎯 LEAGUE AVERAGE DEBUG')
    console.log('Home/Away Filter:', homeAwayFilter)
    console.log('Using Column:', usedColumn)
    console.log('Value Retrieved:', weightedAvg)
    console.log('Stat Category:', statCategory)
    console.log('Full Row Data:', leagueAvgRow)
    console.log('------------------------')
    
    if (!weightedAvg || weightedAvg === 0) {
      // DEBUG: Log missing league average for Championship
      if (selectedLeague === 'Championship') {
        console.log('=== CHAMPIONSHIP LEAGUE AVG MISSING ===')
        console.log('Stat category:', statCategory)
        console.log('League averages:', leagueAverages)
        console.log('Looking for stat_type:', statCategory)
        console.log('Found league avg row:', leagueAvgRow)
        console.log('Weighted avg:', weightedAvg)
        console.log('=======================================')
      }
      return { overOdds: 0, underOdds: 0, expectedValue: 0 }
    }

    const expectedValue = (teamAAvg * teamBAvgAgainst) / weightedAvg

    const overProbability = poissonOverProbability(expectedValue, lineValue[0])
    const underProbability = 1 - overProbability

    const overOdds = probabilityToOdds(overProbability)
    const underOdds = probabilityToOdds(underProbability)

    // DEBUG: Log successful odds calculation for Championship
    if (selectedLeague === 'Championship') {
      console.log('=== CHAMPIONSHIP ODDS SUCCESS ===')
      console.log('Team A avg:', teamAAvg)
      console.log('Team B avg against:', teamBAvgAgainst)
      console.log('League weighted avg:', weightedAvg)
      console.log('Expected value:', expectedValue)
      console.log('Over odds:', overOdds)
      console.log('Under odds:', underOdds)
      console.log('=================================')
    }

    return { 
      overOdds, 
      underOdds, 
      expectedValue: parseFloat(expectedValue.toFixed(2)) 
    }
  }

  const trueOdds = useMemo(() => {
    return calculateTrueOdds()
  }, [selectedTeamA, selectedTeamB, selectedSeason, leagueAverages, teamAData, teamBData, statCategory, displayOption, homeAwayFilter, numberOfMatches, lineValue, useCustomTeamBMatches, teamBMatches, useOutlierSmoothing, smoothingStrength])

  const calcHitRate = (data: number[], referenceLine: number, windowSize: number): number => {
    if (data.length === 0) return 0
    const lastMatches = data.slice(-windowSize)
    const hits = lastMatches.filter(val => val > referenceLine).length
    return (hits / lastMatches.length) * 100
  }

  const hitRateData = useMemo(() => {
    const getMatchResults = (): number[] => {
      if (!teamAData.length) return []
      
      const dataset = useOutlierSmoothing ? chartData.map(d => d.value) : 
                     displayOption === 'combined' ? 
                       teamAData.slice(0, numberOfMatches[0]).map(match => 
                         (match[`${statCategory}_for`] || 0) + (match[`${statCategory}_against`] || 0)
                       ).reverse() :
                     displayOption === 'forA' ?
                       teamAData.slice(0, numberOfMatches[0]).map(match => match[`${statCategory}_for`] || 0).reverse() :
                       teamAData.slice(0, numberOfMatches[0]).map(match => match[`${statCategory}_against`] || 0).reverse()
      
      return dataset
    }

    const matchResults = getMatchResults()
    const hitRate5 = calcHitRate(matchResults, lineValue[0], 5)
    const hitRate10 = calcHitRate(matchResults, lineValue[0], 10)
    const hitRate15 = calcHitRate(matchResults, lineValue[0], 15)

    return { matchResults, hitRate5, hitRate10, hitRate15 }
  }, [teamAData, teamBData, displayOption, numberOfMatches, statCategory, lineValue, selectedSeason, useOutlierSmoothing, chartData])

  const againstAverageData = useMemo(() => {
    if (!teamAData.length) return { home: 0, away: 0 }
    
    const statField = `${statCategory}_against`
    const homeMatches = teamAData.filter(match => match.is_home === true)
    const awayMatches = teamAData.filter(match => match.is_home === false)
    
    const homeAvg = homeMatches.length > 0 
      ? homeMatches.reduce((sum, match) => sum + (match[statField] || 0), 0) / homeMatches.length 
      : 0
    
    const awayAvg = awayMatches.length > 0 
      ? awayMatches.reduce((sum, match) => sum + (match[statField] || 0), 0) / awayMatches.length 
      : 0
    
    return { 
      home: parseFloat(homeAvg.toFixed(1)), 
      away: parseFloat(awayAvg.toFixed(1)) 
    }
  }, [teamAData, statCategory, selectedSeason])

  const formAnalysis = useMemo(() => {
    if (!teamAData.length && !teamBData.length) {
      return { status: 'neutral', difference: 0, recent5Avg: 0, overallAvg: 0 }
    }

    let recentMatches: number[] = []
    let allMatches: number[] = []

    const filterMatches = (matches: MatchData[]) => {
      if (homeAwayFilter === 'home') {
        return matches.filter(match => match.is_home === true)
      } else if (homeAwayFilter === 'away') {
        return matches.filter(match => match.is_home === false)
      }
      return matches
    }

    const filteredTeamAMatches = filterMatches(teamAData)
    const filteredTeamBMatches = filterMatches(teamBData)

    if (displayOption === 'forA') {
      const statField = `${statCategory}_for`
      allMatches = filteredTeamAMatches.slice(0, numberOfMatches[0]).map(match => match[statField] || 0)
      recentMatches = allMatches.slice(0, 5)
    } else if (displayOption === 'againstA') {
      const statField = `${statCategory}_against`
      allMatches = filteredTeamAMatches.slice(0, numberOfMatches[0]).map(match => match[statField] || 0)
      recentMatches = allMatches.slice(0, 5)
    } else if (displayOption === 'combined') {
      const statField = `${statCategory}_for`
      const statAgainstField = `${statCategory}_against`
      allMatches = filteredTeamAMatches.slice(0, numberOfMatches[0]).map(match => 
        (match[statField] || 0) + (match[statAgainstField] || 0)
      )
      recentMatches = allMatches.slice(0, 5)
    }

    if (recentMatches.length === 0 || allMatches.length === 0) {
      return { status: 'neutral', difference: 0, recent5Avg: 0, overallAvg: 0 }
    }

    const recent5Avg = recentMatches.reduce((sum, val) => sum + val, 0) / recentMatches.length
    const overallAvg = allMatches.reduce((sum, val) => sum + val, 0) / allMatches.length
    const difference = recent5Avg - overallAvg

    let status: 'strong' | 'weak' | 'neutral' = 'neutral'
    if (difference > 2.5) {
      status = 'strong'
    } else if (difference < -2.5) {
      status = 'weak'
    }

    return {
      status,
      difference: parseFloat(difference.toFixed(1)),
      recent5Avg: parseFloat(recent5Avg.toFixed(1)),
      overallAvg: parseFloat(overallAvg.toFixed(1))
    }
  }, [teamAData, teamBData, displayOption, statCategory, homeAwayFilter, numberOfMatches, selectedSeason])

  const consistencyAnalysis = useMemo(() => {
    if (!teamAData.length && !teamBData.length) {
      return { level: 'neutral', coefficient: 0, standardDev: 0, mean: 0 }
    }

    let allMatches: number[] = []

    const filterMatches = (matches: MatchData[]) => {
      if (homeAwayFilter === 'home') {
        return matches.filter(match => match.is_home === true)
      } else if (homeAwayFilter === 'away') {
        return matches.filter(match => match.is_home === false)
      }
      return matches
    }

    const filteredTeamAMatches = filterMatches(teamAData)
    const filteredTeamBMatches = filterMatches(teamBData)

    if (displayOption === 'forA') {
      const statField = `${statCategory}_for`
      allMatches = filteredTeamAMatches.slice(0, numberOfMatches[0]).map(match => match[statField] || 0)
    } else if (displayOption === 'againstA') {
      const statField = `${statCategory}_against`
      allMatches = filteredTeamAMatches.slice(0, numberOfMatches[0]).map(match => match[statField] || 0)
    } else if (displayOption === 'combined') {
      const statField = `${statCategory}_for`
      const statAgainstField = `${statCategory}_against`
      allMatches = filteredTeamAMatches.slice(0, numberOfMatches[0]).map(match => 
        (match[statField] || 0) + (match[statAgainstField] || 0)
      )
    }

    if (allMatches.length < 3) {
      return { level: 'neutral', coefficient: 0, standardDev: 0, mean: 0 }
    }

    const mean = allMatches.reduce((sum, val) => sum + val, 0) / allMatches.length

    const variance = allMatches.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allMatches.length
    const standardDev = Math.sqrt(variance)

    const coefficient = mean > 0 ? (standardDev / mean) * 100 : 0

    let level: 'high' | 'medium' | 'low' | 'neutral' = 'neutral'
    if (coefficient < 25) {
      level = 'high'
    } else if (coefficient < 50) {
      level = 'medium'
    } else {
      level = 'low'
    }

    return {
      level,
      coefficient: parseFloat(coefficient.toFixed(1)),
      standardDev: parseFloat(standardDev.toFixed(1)),
      mean: parseFloat(mean.toFixed(1))
    }
  }, [teamAData, teamBData, displayOption, statCategory, homeAwayFilter, numberOfMatches, selectedSeason])

  const swapTeams = () => {
    const tempTeamA = selectedTeamA
    setSelectedTeamA(selectedTeamB)
    setSelectedTeamB(tempTeamA)
  }

  return (
    <div className="flex">
      {/* Left Sidebar */}
      <div className="w-64 p-3">
        <Card className="p-2.5 space-y-1.5">
          <div className="space-y-1.5">
            <h3 className="font-medium text-sm text-white">Filters</h3>
            
            <div className="space-y-1">
              <Label className="text-sm text-white">Stat Category</Label>
              <Select value={statCategory} onValueChange={(value: StatCategory) => setStatCategory(value)}>
                <SelectTrigger className="text-sm h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="goals">Goals</SelectItem>
                  <SelectItem value="shots">Shots</SelectItem>
                  <SelectItem value="shots_on_target">Shots on Target</SelectItem>
                  <SelectItem value="corners">Corners</SelectItem>
                  <SelectItem value="yellow">Yellow Cards</SelectItem>
                  <SelectItem value="red">Red Cards</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-white">League</Label>
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="text-sm h-8">
                  <SelectValue placeholder="Pick league" />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((league) => (
                    <SelectItem key={league} value={league}>
                      {league}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border/30 pt-0.5"></div>

            <div className="space-y-1">
              <Label className="text-sm text-white">Select Team (Team A)</Label>
              <TeamCombobox
                teams={teams}
                value={selectedTeamA}
                onValueChange={setSelectedTeamA}
                placeholder="Pick a team"
                disabled={teams.length === 0}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-white">Select Team (Team B)</Label>
              <TeamCombobox
                teams={teams.filter(team => team !== selectedTeamA)}
                value={selectedTeamB}
                onValueChange={setSelectedTeamB}
                placeholder="Pick a opponent"
                disabled={teams.length === 0}
              />
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs h-7"
              onClick={swapTeams}
              disabled={!selectedTeamA || !selectedTeamB}
            >
              ↔ Swap Teams
            </Button>

            <div className="space-y-1">
              <Label className="text-sm text-white">Season</Label>
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="text-sm h-8">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Seasons</SelectItem>
                  {availableSeasons.map((season) => (
                    <SelectItem key={season} value={season}>
                      {season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border/30"></div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-white">Number of matches</Label>
              <span className="text-sm text-foreground">{numberOfMatches[0]}</span>
            </div>
            <Slider 
              value={numberOfMatches} 
              onValueChange={setNumberOfMatches}
              max={30} 
              min={1} 
              step={1} 
              className="w-full" 
            />
          </div>

          <div className="border-t border-border/30"></div>

          <div className="space-y-1.5">
            <Label className="text-sm text-white">Reference Line</Label>
            <p className="text-xs text-muted-foreground">
              Line represents vs current line. Shows over/under
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Line Value</span>
                <span className="text-sm text-foreground">{lineValue[0]}</span>
              </div>
              <Slider 
                value={getSliderValue()} 
                onValueChange={handleLineValueChange}
                max={getReferenceLineMax() - 1} 
                min={0} 
                step={1} 
                className="w-full" 
              />
            </div>
          </div>

          <div className="border-t border-border/30"></div>

          <div className="space-y-1.5">
            <h3 className="font-medium text-sm text-white">Display Options</h3>
            <RadioGroup value={displayOption} onValueChange={(value: DisplayOption) => setDisplayOption(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="forA" id="for-team-a" />
                <Label htmlFor="for-team-a" className="text-sm text-white">For Team A</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="againstA" id="against-team-a" />
                <Label htmlFor="against-team-a" className="text-sm text-white">Against Team A</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="combined" id="combined" />
                <Label htmlFor="combined" className="text-sm text-white">Combined</Label>
              </div>
            </RadioGroup>
            
            <div className="space-y-1">
              <Label className="text-sm text-white">Match Location</Label>
              <Select value={homeAwayFilter} onValueChange={setHomeAwayFilter}>
                <SelectTrigger className="text-sm h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home-away">Home & Away</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="away">Away</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-6 py-4">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground">📈 Moving Average</div>
            <div className="text-2xl font-bold">{actualMovingAverage}</div>
            <div className="text-xs text-muted-foreground">vs last {numberOfMatches[0]} matches</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-2">🏠 Against Average</div>
            {againstAverageData.home > 0 || againstAverageData.away > 0 ? (
              <div className="space-y-1">
                <div className="text-lg font-bold">{againstAverageData.home} / {againstAverageData.away}</div>
                <div className="text-xs text-muted-foreground">Home / Away</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Select team</div>
            )}
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-2">🎯 Hit Rate</div>
            {hitRateData.matchResults.length > 0 ? (
              <div className="space-y-1">
                <div className="text-lg font-bold">{hitRateData.hitRate5.toFixed(0)}% / {hitRateData.hitRate10.toFixed(0)}% / {hitRateData.hitRate15.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">5 / 10 / 15 matches</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Select teams</div>
            )}
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground">🎯 Selected Line</div>
            <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{lineValue[0]}</div>
            <div className="text-xs text-muted-foreground">{getReferenceLineDescription()}</div>
          </Card>
        </div>

        <Card className="p-5 relative">
          <div className="mb-2">
            <h2 className="text-lg font-semibold">{getChartTitle()}</h2>
            <p className="text-sm text-muted-foreground">
              {displayOption === 'forA' && `${selectedTeamA}'s performance`} 
              {displayOption === 'againstA' && `Conceded by ${selectedTeamA}`}
              {displayOption === 'combined' && `Total ${getStatLabel().toLowerCase()} per match`}
              • {numberOfMatches[0]} Matches • {homeAwayFilter === 'home' ? 'Home only' : homeAwayFilter === 'away' ? 'Away only' : 'Home & Away'}
              • {selectedSeason === 'all' ? 'All Seasons' : selectedSeason}
            </p>
          </div>

          {chartData.length > 0 ? (
            <div 
              className="h-[520px] w-full" 
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ position: 'relative', overflow: 'visible', transform: 'translateX(-20px)' }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 40,
                  }}
                  key={`${selectedTeamA}-${selectedTeamB}-${displayOption}-${homeAwayFilter}`}
                >
                  <defs>
                    <linearGradient id="movingAverageGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8"/>
                    </linearGradient>
                    <linearGradient id="averageAgainstGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8"/>
                      <stop offset="100%" stopColor="#c084fc" stopOpacity="0.8"/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="1 1" 
                    stroke="rgba(255, 255, 255, 0.05)" 
                    horizontal={true}
                    vertical={true}
                  />
                  <XAxis 
                    dataKey="opponent"
                    stroke="white"
                    fontSize={11}
                    tick={{ fill: 'white' }}
                    tickFormatter={(value: string) => {
                      return value && value.length > 12 ? value.substring(0, 10) + '...' : value
                    }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="rgba(255, 255, 255, 0.1)"
                    fontSize={12}
                    tick={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                    tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Bar 
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    onMouseEnter={(data, index) => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    shape={CustomBar}
                    isAnimationActive={true}
                    animationDuration={350}
                    animationEasing="ease-out"
                  >
                    <LabelList 
                      content={(props: any) => <CustomBarLabel {...props} payload={props.payload} />}
                      position="center"
                    />
                  </Bar>

                  {showMovingAverage && (
                    <Line 
                      key="moving-average-line"
                      type="monotone" 
                      dataKey="movingAverage" 
                      stroke="url(#movingAverageGradient)" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#1e40af' }}
                      strokeDasharray="0"
                      isAnimationActive={true}
                      animationDuration={350}
                      animationEasing="ease-out"
                    />
                  )}
                  {showAverageAgainst && displayOption !== 'combined' && (
                    <Line 
                      key="average-against-line"
                      type="monotone" 
                      dataKey="averageAgainst" 
                      stroke="url(#averageAgainstGradient)" 
                      strokeWidth={3}
                      dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#a855f7', strokeWidth: 2, fill: '#7c3aed' }}
                      strokeDasharray="0"
                      isAnimationActive={true}
                      animationDuration={350}
                      animationEasing="ease-out"
                    />
                  )}

                  <ReferenceLine 
                    y={lineValue[0]} 
                    stroke="#f59e0b" 
                    strokeDasharray="3 3"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[520px]">
              <div className="text-center text-muted-foreground">
                {(!selectedTeamA) ? (
                  <p>Select Team A to view analysis</p>
                ) : (
                  <p>No match data available for selected team(s)</p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Right Sidebar */}
      <div className="w-72 p-3 space-y-3 bg-background">
        <Card className="p-4">
          <h3 className="font-medium mb-3">💡 Quick Insights</h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Consistency</span>
                {consistencyAnalysis.level !== 'neutral' ? (
                  <Badge 
                    variant={consistencyAnalysis.level === 'high' ? 'default' : consistencyAnalysis.level === 'medium' ? 'secondary' : 'destructive'} 
                    className={`text-xs ${
                      consistencyAnalysis.level === 'high' 
                        ? 'bg-green-600 text-white border-green-600' 
                        : consistencyAnalysis.level === 'medium'
                        ? 'bg-yellow-600 text-white border-yellow-600'
                        : 'bg-red-600 text-white border-red-600'
                    }`}
                  >
                    {consistencyAnalysis.level === 'high' ? 'High' : consistencyAnalysis.level === 'medium' ? 'Medium' : 'Low'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    N/A
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                CV: {consistencyAnalysis.coefficient}% | σ: {consistencyAnalysis.standardDev}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Form</span>
                {formAnalysis.status !== 'neutral' ? (
                  <Badge 
                    variant={formAnalysis.status === 'strong' ? 'default' : 'destructive'} 
                    className={`text-xs ${
                      formAnalysis.status === 'strong' 
                        ? 'bg-green-600 text-white border-green-600' 
                        : 'bg-red-600 text-white border-red-600'
                    }`}
                  >
                    {formAnalysis.status === 'strong' ? 'Strong' : 'Weak'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Neutral
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Recent 5: {formAnalysis.recent5Avg} | Overall: {formAnalysis.overallAvg}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Sample Size</span>
                <span className="text-xs font-medium">{numberOfMatches[0]} matches</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">Calculated odds</h3>
          {trueOdds.overOdds > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Over {lineValue[0]} {getStatLabel().toLowerCase()}</span>
                <div className="text-right">
                  <div className="text-green-400 font-bold">{trueOdds.overOdds}</div>
                  <div className="text-xs text-muted-foreground">{((1/trueOdds.overOdds)*100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Under {lineValue[0]} {getStatLabel().toLowerCase()}</span>
                <div className="text-right">
                  <div className="text-red-400 font-bold">{trueOdds.underOdds}</div>
                  <div className="text-xs text-muted-foreground">{((1/trueOdds.underOdds)*100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Expected Value:</span>
                  <span className="font-medium">{trueOdds.expectedValue}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Sample Size:</span>
                  <span className="font-medium">
                    {useCustomTeamBMatches ? `${numberOfMatches[0]} / ${teamBMatches[0]}` : `${numberOfMatches[0]}`} matches
                  </span>
                </div>
                {useCustomTeamBMatches && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Team B Matches:</span>
                    <span className="font-medium">{teamBMatches[0]} (custom)</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Filter:</span>
                  <span className="font-medium">{homeAwayFilter === 'home' ? 'Home' : homeAwayFilter === 'away' ? 'Away' : 'All'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm">
              {!selectedLeague ? 'Select a league' : 
               (!selectedTeamA || !selectedTeamB) ? 'Select both teams' :
               leagueAverages.length === 0 ? 'Loading league data...' :
               'Calculating odds...'}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">⚙️ Advanced Settings</h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="moving-average-sidebar" 
                  checked={showMovingAverage}
                  onCheckedChange={setShowMovingAverage}
                />
                <ArrowRight className="w-3 h-3 text-blue-400" />
                <Label htmlFor="moving-average-sidebar" className="text-sm text-white">Moving Average</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="average-against-sidebar" 
                  checked={showAverageAgainst}
                  onCheckedChange={setShowAverageAgainst}
                />
                <TrendingUp className="w-3 h-3 text-purple-400" />
                <Label htmlFor="average-against-sidebar" className="text-sm text-white">
                  {displayOption === 'againstA' ? 'Moving Against' : 'Average Against'}
                </Label>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-team-b-matches" className="text-sm text-white">
                    Custom Team B Matches
                  </Label>
                  <Switch
                    id="custom-team-b-matches"
                    checked={useCustomTeamBMatches}
                    onCheckedChange={setUseCustomTeamBMatches}
                  />
                </div>
                
                {useCustomTeamBMatches && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Team B matches for odds</span>
                      <span className="text-xs text-foreground">{teamBMatches[0]}</span>
                    </div>
                    <Slider 
                      value={teamBMatches} 
                      onValueChange={setTeamBMatches}
                      max={30} 
                      min={1} 
                      step={1} 
                      className="w-full" 
                    />
                    <div className="text-xs text-muted-foreground">
                      Controls Team B's "avg against" calculation
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="outlier-smoothing" className="text-sm text-white">
                    Outlier Smoothing
                  </Label>
                  <Switch
                    id="outlier-smoothing"
                    checked={useOutlierSmoothing}
                    onCheckedChange={setUseOutlierSmoothing}
                  />
                </div>
                
                {useOutlierSmoothing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Smoothing strength</span>
                      <span className="text-xs text-foreground">
                        {smoothingStrength[0] === 1 ? 'Mild' : smoothingStrength[0] === 2 ? 'Medium' : 'Strong'}
                      </span>
                    </div>
                    <Slider 
                      value={smoothingStrength} 
                      onValueChange={setSmoothingStrength}
                      max={3} 
                      min={1} 
                      step={1} 
                      className="w-full" 
                    />
                    <div className="text-xs text-muted-foreground">
                      {smoothingStrength[0] === 1 && '3σ threshold (mild smoothing)'}
                      {smoothingStrength[0] === 2 && '2σ threshold (medium smoothing)'}
                      {smoothingStrength[0] === 3 && '1.5σ threshold (strong smoothing)'}
                    </div>
                    <div className="text-xs text-orange-400">
                      Orange labels indicate smoothed values
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-white">
                    Exclude Matches
                  </Label>
                </div>
                
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between text-xs h-8"
                        disabled={getAvailableMatches.length === 0}
                      >
                        {getAvailableMatches.length > 0 ? 'Select match to exclude' : 'No matches available'}
                        <ArrowRight className="ml-2 h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search matches..." className="h-9" />
                        <CommandList className="max-h-[200px]">
                          <CommandEmpty>No matches found.</CommandEmpty>
                          <CommandGroup>
                            {getAvailableMatches.map((match) => (
                              <CommandItem
                                key={match.id}
                                value={match.label}
                                onSelect={() => {
                                  handleExcludeMatch(match.id)
                                }}
                                className="text-xs"
                              >
                                {match.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {getExcludedMatchesDisplay.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs text-muted-foreground">Excluded ({excludedMatches.size}):</div>
                      <div className="flex flex-wrap gap-1.5">
                        {getExcludedMatchesDisplay.map((match) => (
                          <Badge
                            key={match.id}
                            variant="secondary"
                            className="text-xs px-2 py-0.5 flex items-center gap-1"
                          >
                            <span className="max-w-[150px] truncate">{match.label}</span>
                            <button
                              onClick={() => handleIncludeMatch(match.id)}
                              className="ml-1 hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Excluded matches are removed from all calculations
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}