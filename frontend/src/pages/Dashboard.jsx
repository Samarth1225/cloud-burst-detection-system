import { useState, useEffect, useCallback, useRef } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, parseISO, addDays } from 'date-fns'
import RiskGauge from '../components/RiskGauge'
import AlertBanner from '../components/AlertBanner'
import MetricCard from '../components/MetricCard'
import WeatherChart from '../components/WeatherChart'
import { simulatePrediction, simulateWeatherHistory } from '../utils/api'

const OWM_KEY = '53ebcc7377016052b759446896c5559c'
const OWM_BASE = 'https://api.openweathermap.org/data/2.5'

const LOCATIONS = [
  // ── Himachal Pradesh ─────────────────────────────────────────────────────
  { id:'L001', name:'Shimla',             state:'Himachal Pradesh', lat:31.1048, lon:77.1734, elev:2202 },
  { id:'L002', name:'Manali',             state:'Himachal Pradesh', lat:32.2190, lon:77.1890, elev:2050 },
  { id:'L003', name:'Dharamshala',        state:'Himachal Pradesh', lat:32.2190, lon:76.3234, elev:1457 },
  { id:'L004', name:'Kullu',              state:'Himachal Pradesh', lat:31.9579, lon:77.1095, elev:1219 },
  { id:'L005', name:'Mandi',              state:'Himachal Pradesh', lat:31.7080, lon:76.9318, elev:800  },
  { id:'L006', name:'Solan',              state:'Himachal Pradesh', lat:30.9045, lon:77.0967, elev:1350 },
  { id:'L007', name:'Chamba',             state:'Himachal Pradesh', lat:32.5534, lon:76.1258, elev:996  },
  { id:'L008', name:'Bilaspur',           state:'Himachal Pradesh', lat:31.3390, lon:76.7605, elev:673  },
  { id:'L009', name:'Hamirpur',           state:'Himachal Pradesh', lat:31.6862, lon:76.5215, elev:786  },
  { id:'L010', name:'Una',                state:'Himachal Pradesh', lat:31.4685, lon:76.2694, elev:370  },
  { id:'L011', name:'Kangra',             state:'Himachal Pradesh', lat:32.0998, lon:76.2691, elev:733  },
  { id:'L012', name:'Kinnaur',            state:'Himachal Pradesh', lat:31.5926, lon:78.0049, elev:2320 },
  { id:'L013', name:'Spiti Valley',       state:'Himachal Pradesh', lat:32.2461, lon:78.0338, elev:3800 },
  { id:'L014', name:'Nahan',              state:'Himachal Pradesh', lat:30.5595, lon:77.2956, elev:932  },
  { id:'L015', name:'Kasauli',            state:'Himachal Pradesh', lat:30.8991, lon:76.9659, elev:1795 },
  { id:'L016', name:'Palampur',           state:'Himachal Pradesh', lat:32.1100, lon:76.5370, elev:1472 },
  { id:'L017', name:'Dalhousie',          state:'Himachal Pradesh', lat:32.5390, lon:75.9740, elev:2036 },
  { id:'L018', name:'Kufri',              state:'Himachal Pradesh', lat:31.0985, lon:77.2636, elev:2600 },
  { id:'L019', name:'Narkanda',           state:'Himachal Pradesh', lat:31.2710, lon:77.4490, elev:2708 },
  { id:'L020', name:'Rampur Bushahr',     state:'Himachal Pradesh', lat:31.4488, lon:77.6333, elev:975  },
  { id:'L021', name:'Recong Peo',         state:'Himachal Pradesh', lat:31.5374, lon:78.2703, elev:2290 },
  { id:'L022', name:'Lahaul',             state:'Himachal Pradesh', lat:32.5700, lon:77.5800, elev:3300 },
  { id:'L023', name:'Rohtang Pass',       state:'Himachal Pradesh', lat:32.3688, lon:77.2445, elev:3978 },
  // ── Uttarakhand ──────────────────────────────────────────────────────────
  { id:'L024', name:'Dehradun',           state:'Uttarakhand',      lat:30.3165, lon:78.0322, elev:640  },
  { id:'L025', name:'Mussoorie',          state:'Uttarakhand',      lat:30.4598, lon:78.0644, elev:2005 },
  { id:'L026', name:'Haridwar',           state:'Uttarakhand',      lat:29.9457, lon:78.1642, elev:314  },
  { id:'L027', name:'Rishikesh',          state:'Uttarakhand',      lat:30.0869, lon:78.2676, elev:372  },
  { id:'L028', name:'Nainital',           state:'Uttarakhand',      lat:29.3803, lon:79.4636, elev:2084 },
  { id:'L029', name:'Kedarnath',          state:'Uttarakhand',      lat:30.7346, lon:79.0669, elev:3584 },
  { id:'L030', name:'Badrinath',          state:'Uttarakhand',      lat:30.7433, lon:79.4938, elev:3300 },
  { id:'L031', name:'Almora',             state:'Uttarakhand',      lat:29.5971, lon:79.6591, elev:1638 },
  { id:'L032', name:'Pithoragarh',        state:'Uttarakhand',      lat:29.5829, lon:80.2181, elev:1814 },
  { id:'L033', name:'Haldwani',           state:'Uttarakhand',      lat:29.2183, lon:79.5130, elev:424  },
  { id:'L034', name:'Rudraprayag',        state:'Uttarakhand',      lat:30.2847, lon:78.9814, elev:895  },
  { id:'L035', name:'Chamoli',            state:'Uttarakhand',      lat:30.4021, lon:79.3256, elev:1300 },
  { id:'L036', name:'Uttarkashi',         state:'Uttarakhand',      lat:30.7268, lon:78.4354, elev:1158 },
  { id:'L037', name:'Tehri',              state:'Uttarakhand',      lat:30.3780, lon:78.4800, elev:770  },
  { id:'L038', name:'Pauri Garhwal',      state:'Uttarakhand',      lat:30.1458, lon:78.7798, elev:1650 },
  { id:'L039', name:'Lansdowne',          state:'Uttarakhand',      lat:29.8376, lon:78.6868, elev:1706 },
  { id:'L040', name:'Chakrata',           state:'Uttarakhand',      lat:30.6918, lon:77.8680, elev:2118 },
  { id:'L041', name:'Ranikhet',           state:'Uttarakhand',      lat:29.6400, lon:79.4300, elev:1829 },
  { id:'L042', name:'Roorkee',            state:'Uttarakhand',      lat:29.8543, lon:77.8880, elev:268  },
  { id:'L043', name:'Ramnagar',           state:'Uttarakhand',      lat:29.3947, lon:79.1294, elev:345  },
  // ── Jammu & Kashmir ──────────────────────────────────────────────────────
  { id:'L044', name:'Srinagar',           state:'Jammu & Kashmir',  lat:34.0837, lon:74.7973, elev:1585 },
  { id:'L045', name:'Jammu',              state:'Jammu & Kashmir',  lat:32.7266, lon:74.8570, elev:327  },
  { id:'L046', name:'Gulmarg',            state:'Jammu & Kashmir',  lat:34.0484, lon:74.3805, elev:2650 },
  { id:'L047', name:'Pahalgam',           state:'Jammu & Kashmir',  lat:34.0161, lon:75.3150, elev:2130 },
  { id:'L048', name:'Sonamarg',           state:'Jammu & Kashmir',  lat:34.3000, lon:75.3167, elev:2800 },
  { id:'L049', name:'Anantnag',           state:'Jammu & Kashmir',  lat:33.7311, lon:75.1487, elev:1805 },
  { id:'L050', name:'Baramulla',          state:'Jammu & Kashmir',  lat:34.2000, lon:74.3500, elev:1565 },
  { id:'L051', name:'Kathua',             state:'Jammu & Kashmir',  lat:32.3800, lon:75.5200, elev:330  },
  { id:'L052', name:'Udhampur',           state:'Jammu & Kashmir',  lat:32.9160, lon:75.1410, elev:756  },
  { id:'L053', name:'Poonch',             state:'Jammu & Kashmir',  lat:33.7737, lon:74.0930, elev:975  },
  { id:'L054', name:'Rajouri',            state:'Jammu & Kashmir',  lat:33.3786, lon:74.3128, elev:915  },
  { id:'L055', name:'Doda',               state:'Jammu & Kashmir',  lat:33.1490, lon:75.5480, elev:1095 },
  { id:'L056', name:'Kishtwar',           state:'Jammu & Kashmir',  lat:33.3130, lon:75.7700, elev:1650 },
  // ── Ladakh ───────────────────────────────────────────────────────────────
  { id:'L057', name:'Leh',                state:'Ladakh',           lat:34.1526, lon:77.5771, elev:3524 },
  { id:'L058', name:'Kargil',             state:'Ladakh',           lat:34.5539, lon:76.1349, elev:2676 },
  { id:'L059', name:'Nubra Valley',       state:'Ladakh',           lat:34.6500, lon:77.5500, elev:3048 },
  { id:'L060', name:'Pangong Lake',       state:'Ladakh',           lat:33.7500, lon:78.6667, elev:4350 },
  { id:'L061', name:'Diskit',             state:'Ladakh',           lat:34.6900, lon:77.5700, elev:3080 },
  // ── Punjab ───────────────────────────────────────────────────────────────
  { id:'L062', name:'Amritsar',           state:'Punjab',           lat:31.6340, lon:74.8723, elev:234  },
  { id:'L063', name:'Ludhiana',           state:'Punjab',           lat:30.9010, lon:75.8573, elev:244  },
  { id:'L064', name:'Pathankot',          state:'Punjab',           lat:32.2742, lon:75.6522, elev:322  },
  { id:'L065', name:'Gurdaspur',          state:'Punjab',           lat:32.0405, lon:75.4065, elev:290  },
  { id:'L066', name:'Jalandhar',          state:'Punjab',           lat:31.3260, lon:75.5762, elev:228  },
  { id:'L067', name:'Patiala',            state:'Punjab',           lat:30.3398, lon:76.3869, elev:250  },
  { id:'L068', name:'Bathinda',           state:'Punjab',           lat:30.2110, lon:74.9455, elev:211  },
  { id:'L069', name:'Hoshiarpur',         state:'Punjab',           lat:31.5143, lon:75.9115, elev:280  },
  { id:'L070', name:'Ropar (Rupnagar)',   state:'Punjab',           lat:30.9649, lon:76.5282, elev:296  },
  { id:'L071', name:'Mohali',             state:'Punjab',           lat:30.7046, lon:76.7179, elev:310  },
  { id:'L072', name:'Firozpur',           state:'Punjab',           lat:30.9254, lon:74.6130, elev:185  },
  { id:'L073', name:'Sangrur',            state:'Punjab',           lat:30.2456, lon:75.8466, elev:225  },
  { id:'L074', name:'Moga',               state:'Punjab',           lat:30.8168, lon:75.1736, elev:212  },
  { id:'L075', name:'Fatehgarh Sahib',    state:'Punjab',           lat:30.6490, lon:76.3880, elev:247  },
  // ── Chandigarh ───────────────────────────────────────────────────────────
  { id:'L076', name:'Chandigarh',         state:'Chandigarh UT',    lat:30.7333, lon:76.7794, elev:321  },
  // ── Haryana ──────────────────────────────────────────────────────────────
  { id:'L077', name:'Ambala',             state:'Haryana',          lat:30.3782, lon:76.7767, elev:270  },
  { id:'L078', name:'Panchkula',          state:'Haryana',          lat:30.6942, lon:76.8606, elev:365  },
  { id:'L079', name:'Yamunanagar',        state:'Haryana',          lat:30.1290, lon:77.2674, elev:282  },
  { id:'L080', name:'Karnal',             state:'Haryana',          lat:29.6857, lon:76.9905, elev:250  },
  { id:'L081', name:'Panipat',            state:'Haryana',          lat:29.3909, lon:76.9635, elev:226  },
  { id:'L082', name:'Sonipat',            state:'Haryana',          lat:28.9931, lon:77.0151, elev:226  },
  { id:'L083', name:'Rohtak',             state:'Haryana',          lat:28.8955, lon:76.6066, elev:220  },
  { id:'L084', name:'Gurugram',           state:'Haryana',          lat:28.4595, lon:77.0266, elev:217  },
  { id:'L085', name:'Faridabad',          state:'Haryana',          lat:28.4089, lon:77.3178, elev:198  },
  { id:'L086', name:'Hisar',              state:'Haryana',          lat:29.1492, lon:75.7217, elev:215  },
  { id:'L087', name:'Sirsa',              state:'Haryana',          lat:29.5330, lon:75.0234, elev:206  },
  { id:'L088', name:'Nuh',                state:'Haryana',          lat:28.1068, lon:77.0000, elev:219  },
  { id:'L089', name:'Kurukshetra',        state:'Haryana',          lat:29.9695, lon:76.8783, elev:253  },
  { id:'L090', name:'Bhiwani',            state:'Haryana',          lat:28.7980, lon:76.1340, elev:220  },
  // ── Delhi ────────────────────────────────────────────────────────────────
  { id:'L091', name:'New Delhi',          state:'Delhi',            lat:28.6139, lon:77.2090, elev:216  },
  { id:'L092', name:'North Delhi',        state:'Delhi',            lat:28.7041, lon:77.1025, elev:212  },
  { id:'L093', name:'East Delhi',         state:'Delhi',            lat:28.6600, lon:77.2900, elev:213  },
  { id:'L094', name:'South Delhi',        state:'Delhi',            lat:28.5300, lon:77.2200, elev:220  },
  { id:'L095', name:'Dwarka',             state:'Delhi',            lat:28.5921, lon:77.0460, elev:208  },
  // ── Uttar Pradesh ────────────────────────────────────────────────────────
  { id:'L096', name:'Lucknow',            state:'Uttar Pradesh',    lat:26.8467, lon:80.9462, elev:123  },
  { id:'L097', name:'Agra',               state:'Uttar Pradesh',    lat:27.1767, lon:78.0081, elev:169  },
  { id:'L098', name:'Kanpur',             state:'Uttar Pradesh',    lat:26.4499, lon:80.3319, elev:126  },
  { id:'L099', name:'Varanasi',           state:'Uttar Pradesh',    lat:25.3176, lon:82.9739, elev:80   },
  { id:'L100', name:'Prayagraj',          state:'Uttar Pradesh',    lat:25.4358, lon:81.8463, elev:98   },
  { id:'L101', name:'Meerut',             state:'Uttar Pradesh',    lat:28.9845, lon:77.7064, elev:225  },
  { id:'L102', name:'Noida',              state:'Uttar Pradesh',    lat:28.5355, lon:77.3910, elev:198  },
  { id:'L103', name:'Ghaziabad',          state:'Uttar Pradesh',    lat:28.6692, lon:77.4538, elev:200  },
  { id:'L104', name:'Bareilly',           state:'Uttar Pradesh',    lat:28.3670, lon:79.4304, elev:173  },
  { id:'L105', name:'Moradabad',          state:'Uttar Pradesh',    lat:28.8386, lon:78.7733, elev:186  },
  { id:'L106', name:'Gorakhpur',          state:'Uttar Pradesh',    lat:26.7606, lon:83.3732, elev:84   },
  { id:'L107', name:'Mathura',            state:'Uttar Pradesh',    lat:27.4924, lon:77.6737, elev:174  },
  { id:'L108', name:'Aligarh',            state:'Uttar Pradesh',    lat:27.8974, lon:78.0880, elev:178  },
  { id:'L109', name:'Muzaffarnagar',      state:'Uttar Pradesh',    lat:29.4727, lon:77.7085, elev:271  },
  { id:'L110', name:'Saharanpur',         state:'Uttar Pradesh',    lat:29.9680, lon:77.5510, elev:274  },
  { id:'L111', name:'Ayodhya',            state:'Uttar Pradesh',    lat:26.7922, lon:82.1998, elev:93   },
  { id:'L112', name:'Jhansi',             state:'Uttar Pradesh',    lat:25.4484, lon:78.5685, elev:285  },
  { id:'L113', name:'Gonda',              state:'Uttar Pradesh',    lat:27.1333, lon:81.9667, elev:106  },
  { id:'L114', name:'Chitrakoot',         state:'Uttar Pradesh',    lat:25.1990, lon:80.8810, elev:150  },
  // ── Rajasthan ────────────────────────────────────────────────────────────
  { id:'L115', name:'Jaipur',             state:'Rajasthan',        lat:26.9124, lon:75.7873, elev:431  },
  { id:'L116', name:'Jodhpur',            state:'Rajasthan',        lat:26.2389, lon:73.0243, elev:231  },
  { id:'L117', name:'Udaipur',            state:'Rajasthan',        lat:24.5854, lon:73.7125, elev:598  },
  { id:'L118', name:'Kota',               state:'Rajasthan',        lat:25.2138, lon:75.8648, elev:271  },
  { id:'L119', name:'Ajmer',              state:'Rajasthan',        lat:26.4499, lon:74.6399, elev:486  },
  { id:'L120', name:'Bikaner',            state:'Rajasthan',        lat:28.0229, lon:73.3119, elev:234  },
  { id:'L121', name:'Alwar',              state:'Rajasthan',        lat:27.5530, lon:76.6346, elev:271  },
  { id:'L122', name:'Bharatpur',          state:'Rajasthan',        lat:27.2152, lon:77.4902, elev:178  },
  { id:'L123', name:'Sikar',              state:'Rajasthan',        lat:27.6094, lon:75.1397, elev:427  },
  { id:'L124', name:'Mount Abu',          state:'Rajasthan',        lat:24.5926, lon:72.7156, elev:1220 },
  { id:'L125', name:'Chittorgarh',        state:'Rajasthan',        lat:24.8887, lon:74.6269, elev:394  },
  { id:'L126', name:'Jaisalmer',          state:'Rajasthan',        lat:26.9157, lon:70.9083, elev:225  },
  { id:'L127', name:'Pushkar',            state:'Rajasthan',        lat:26.4892, lon:74.5502, elev:510  },
  { id:'L128', name:'Barmer',             state:'Rajasthan',        lat:25.7463, lon:71.3942, elev:207  },
  { id:'L129', name:'Dungarpur',          state:'Rajasthan',        lat:23.8430, lon:73.7156, elev:290  },
  { id:'L130', name:'Ranthambore',        state:'Rajasthan',        lat:26.0173, lon:76.5026, elev:274  },
  // ── Gujarat ──────────────────────────────────────────────────────────────
  { id:'L131', name:'Ahmedabad',          state:'Gujarat',          lat:23.0225, lon:72.5714, elev:53   },
  { id:'L132', name:'Surat',              state:'Gujarat',          lat:21.1702, lon:72.8311, elev:13   },
  { id:'L133', name:'Vadodara',           state:'Gujarat',          lat:22.3072, lon:73.1812, elev:37   },
  { id:'L134', name:'Rajkot',             state:'Gujarat',          lat:22.3039, lon:70.8022, elev:138  },
  { id:'L135', name:'Bhavnagar',          state:'Gujarat',          lat:21.7645, lon:72.1519, elev:21   },
  { id:'L136', name:'Jamnagar',           state:'Gujarat',          lat:22.4707, lon:70.0577, elev:27   },
  { id:'L137', name:'Gandhinagar',        state:'Gujarat',          lat:23.2156, lon:72.6369, elev:81   },
  { id:'L138', name:'Anand',              state:'Gujarat',          lat:22.5645, lon:72.9289, elev:44   },
  { id:'L139', name:'Kutch (Bhuj)',       state:'Gujarat',          lat:23.2420, lon:69.6669, elev:82   },
  { id:'L140', name:'Saputara',           state:'Gujarat',          lat:20.5700, lon:73.7500, elev:875  },
  { id:'L141', name:'Dang',               state:'Gujarat',          lat:20.7500, lon:73.7000, elev:400  },
  { id:'L142', name:'Porbandar',          state:'Gujarat',          lat:21.6425, lon:69.6093, elev:5    },
  { id:'L143', name:'Navsari',            state:'Gujarat',          lat:20.9467, lon:72.9520, elev:8    },
  // ── Maharashtra ──────────────────────────────────────────────────────────
  { id:'L144', name:'Mumbai',             state:'Maharashtra',      lat:19.0760, lon:72.8777, elev:14   },
  { id:'L145', name:'Pune',               state:'Maharashtra',      lat:18.5204, lon:73.8567, elev:560  },
  { id:'L146', name:'Nashik',             state:'Maharashtra',      lat:19.9975, lon:73.7898, elev:566  },
  { id:'L147', name:'Nagpur',             state:'Maharashtra',      lat:21.1458, lon:79.0882, elev:310  },
  { id:'L148', name:'Aurangabad',         state:'Maharashtra',      lat:19.8762, lon:75.3433, elev:513  },
  { id:'L149', name:'Mahabaleshwar',      state:'Maharashtra',      lat:17.9237, lon:73.6586, elev:1353 },
  { id:'L150', name:'Solapur',            state:'Maharashtra',      lat:17.6599, lon:75.9064, elev:479  },
  { id:'L151', name:'Kolhapur',           state:'Maharashtra',      lat:16.7050, lon:74.2433, elev:569  },
  { id:'L152', name:'Amravati',           state:'Maharashtra',      lat:20.9320, lon:77.7523, elev:340  },
  { id:'L153', name:'Ratnagiri',          state:'Maharashtra',      lat:16.9902, lon:73.3120, elev:15   },
  { id:'L154', name:'Satara',             state:'Maharashtra',      lat:17.6805, lon:74.0183, elev:666  },
  { id:'L155', name:'Latur',              state:'Maharashtra',      lat:18.4088, lon:76.5604, elev:540  },
  { id:'L156', name:'Thane',              state:'Maharashtra',      lat:19.2183, lon:72.9781, elev:7    },
  { id:'L157', name:'Lonavala',           state:'Maharashtra',      lat:18.7481, lon:73.4072, elev:622  },
  { id:'L158', name:'Matheran',           state:'Maharashtra',      lat:18.9833, lon:73.2667, elev:800  },
  { id:'L159', name:'Nanded',             state:'Maharashtra',      lat:19.1383, lon:77.3210, elev:367  },
  { id:'L160', name:'Sindhudurg',         state:'Maharashtra',      lat:16.3500, lon:73.5500, elev:7    },
  // ── Madhya Pradesh ───────────────────────────────────────────────────────
  { id:'L161', name:'Bhopal',             state:'Madhya Pradesh',   lat:23.2599, lon:77.4126, elev:527  },
  { id:'L162', name:'Indore',             state:'Madhya Pradesh',   lat:22.7196, lon:75.8577, elev:553  },
  { id:'L163', name:'Gwalior',            state:'Madhya Pradesh',   lat:26.2183, lon:78.1828, elev:197  },
  { id:'L164', name:'Jabalpur',           state:'Madhya Pradesh',   lat:23.1815, lon:79.9864, elev:412  },
  { id:'L165', name:'Ujjain',             state:'Madhya Pradesh',   lat:23.1765, lon:75.7885, elev:491  },
  { id:'L166', name:'Pachmarhi',          state:'Madhya Pradesh',   lat:22.4674, lon:78.4338, elev:1067 },
  { id:'L167', name:'Rewa',               state:'Madhya Pradesh',   lat:24.5362, lon:81.2961, elev:360  },
  { id:'L168', name:'Sagar',              state:'Madhya Pradesh',   lat:23.8388, lon:78.7378, elev:520  },
  { id:'L169', name:'Pench',              state:'Madhya Pradesh',   lat:21.7560, lon:79.2750, elev:370  },
  { id:'L170', name:'Kanha',              state:'Madhya Pradesh',   lat:22.3310, lon:80.6110, elev:620  },
  { id:'L171', name:'Orchha',             state:'Madhya Pradesh',   lat:25.3522, lon:78.6415, elev:246  },
  // ── Chhattisgarh ─────────────────────────────────────────────────────────
  { id:'L172', name:'Raipur',             state:'Chhattisgarh',     lat:21.2514, lon:81.6296, elev:298  },
  { id:'L173', name:'Bilaspur',           state:'Chhattisgarh',     lat:22.0797, lon:82.1391, elev:264  },
  { id:'L174', name:'Durg',               state:'Chhattisgarh',     lat:21.1904, lon:81.2849, elev:303  },
  { id:'L175', name:'Jagdalpur',          state:'Chhattisgarh',     lat:19.0700, lon:82.0200, elev:553  },
  { id:'L176', name:'Korba',              state:'Chhattisgarh',     lat:22.3595, lon:82.7501, elev:259  },
  { id:'L177', name:'Bastar',             state:'Chhattisgarh',     lat:19.1200, lon:81.9700, elev:559  },
  // ── Bihar ────────────────────────────────────────────────────────────────
  { id:'L178', name:'Patna',              state:'Bihar',            lat:25.5941, lon:85.1376, elev:53   },
  { id:'L179', name:'Gaya',               state:'Bihar',            lat:24.7914, lon:85.0002, elev:111  },
  { id:'L180', name:'Muzaffarpur',        state:'Bihar',            lat:26.1209, lon:85.3647, elev:55   },
  { id:'L181', name:'Bhagalpur',          state:'Bihar',            lat:25.2425, lon:87.0107, elev:40   },
  { id:'L182', name:'Darbhanga',          state:'Bihar',            lat:26.1542, lon:85.8918, elev:52   },
  { id:'L183', name:'Purnia',             state:'Bihar',            lat:25.7771, lon:87.4753, elev:33   },
  { id:'L184', name:'Bodhgaya',           state:'Bihar',            lat:24.6952, lon:84.9914, elev:113  },
  { id:'L185', name:'Rajgir',             state:'Bihar',            lat:25.0280, lon:85.4190, elev:73   },
  // ── Jharkhand ────────────────────────────────────────────────────────────
  { id:'L186', name:'Ranchi',             state:'Jharkhand',        lat:23.3441, lon:85.3096, elev:651  },
  { id:'L187', name:'Jamshedpur',         state:'Jharkhand',        lat:22.8046, lon:86.2029, elev:135  },
  { id:'L188', name:'Dhanbad',            state:'Jharkhand',        lat:23.7957, lon:86.4304, elev:233  },
  { id:'L189', name:'Bokaro',             state:'Jharkhand',        lat:23.6693, lon:86.1511, elev:234  },
  { id:'L190', name:'Deoghar',            state:'Jharkhand',        lat:24.4853, lon:86.6956, elev:254  },
  { id:'L191', name:'Netarhat',           state:'Jharkhand',        lat:23.4870, lon:84.2720, elev:1128 },
  // ── West Bengal ──────────────────────────────────────────────────────────
  { id:'L192', name:'Kolkata',            state:'West Bengal',      lat:22.5726, lon:88.3639, elev:9    },
  { id:'L193', name:'Darjeeling',         state:'West Bengal',      lat:27.0410, lon:88.2663, elev:2042 },
  { id:'L194', name:'Siliguri',           state:'West Bengal',      lat:26.7271, lon:88.3953, elev:122  },
  { id:'L195', name:'Asansol',            state:'West Bengal',      lat:23.6888, lon:86.9661, elev:118  },
  { id:'L196', name:'Durgapur',           state:'West Bengal',      lat:23.5204, lon:87.3119, elev:79   },
  { id:'L197', name:'Jalpaiguri',         state:'West Bengal',      lat:26.5167, lon:88.7167, elev:78   },
  { id:'L198', name:'Cooch Behar',        state:'West Bengal',      lat:26.3452, lon:89.4430, elev:43   },
  { id:'L199', name:'Malda',              state:'West Bengal',      lat:25.0108, lon:88.1417, elev:28   },
  { id:'L200', name:'Kalimpong',          state:'West Bengal',      lat:27.0668, lon:88.4700, elev:1247 },
  { id:'L201', name:'Bankura',            state:'West Bengal',      lat:23.2300, lon:87.0700, elev:131  },
  { id:'L202', name:'Purulia',            state:'West Bengal',      lat:23.3300, lon:86.3600, elev:237  },
  // ── Assam ────────────────────────────────────────────────────────────────
  { id:'L203', name:'Guwahati',           state:'Assam',            lat:26.1445, lon:91.7362, elev:55   },
  { id:'L204', name:'Dibrugarh',          state:'Assam',            lat:27.4728, lon:94.9120, elev:111  },
  { id:'L205', name:'Silchar',            state:'Assam',            lat:24.8333, lon:92.7789, elev:23   },
  { id:'L206', name:'Jorhat',             state:'Assam',            lat:26.7509, lon:94.2037, elev:116  },
  { id:'L207', name:'Tezpur',             state:'Assam',            lat:26.6338, lon:92.8000, elev:48   },
  { id:'L208', name:'Nagaon',             state:'Assam',            lat:26.3466, lon:92.6931, elev:57   },
  { id:'L209', name:'Bongaigaon',         state:'Assam',            lat:26.4776, lon:90.5584, elev:40   },
  { id:'L210', name:'North Lakhimpur',    state:'Assam',            lat:27.2350, lon:94.1027, elev:101  },
  { id:'L211', name:'Hailakandi',         state:'Assam',            lat:24.6833, lon:92.5667, elev:20   },
  // ── Meghalaya ────────────────────────────────────────────────────────────
  { id:'L212', name:'Shillong',           state:'Meghalaya',        lat:25.5788, lon:91.8933, elev:1491 },
  { id:'L213', name:'Cherrapunji',        state:'Meghalaya',        lat:25.2800, lon:91.7200, elev:1484 },
  { id:'L214', name:'Mawsynram',          state:'Meghalaya',        lat:25.2967, lon:91.5833, elev:1401 },
  { id:'L215', name:'Tura',               state:'Meghalaya',        lat:25.5148, lon:90.2168, elev:322  },
  { id:'L216', name:'Jowai',              state:'Meghalaya',        lat:25.4500, lon:92.2000, elev:1352 },
  { id:'L217', name:'Nongpoh',            state:'Meghalaya',        lat:25.9000, lon:91.8833, elev:532  },
  // ── Manipur ──────────────────────────────────────────────────────────────
  { id:'L218', name:'Imphal',             state:'Manipur',          lat:24.8170, lon:93.9368, elev:786  },
  { id:'L219', name:'Churachandpur',      state:'Manipur',          lat:24.3333, lon:93.6833, elev:940  },
  { id:'L220', name:'Ukhrul',             state:'Manipur',          lat:25.1000, lon:94.3667, elev:1830 },
  { id:'L221', name:'Senapati',           state:'Manipur',          lat:25.2667, lon:93.9667, elev:1370 },
  // ── Mizoram ──────────────────────────────────────────────────────────────
  { id:'L222', name:'Aizawl',             state:'Mizoram',          lat:23.7271, lon:92.7176, elev:1132 },
  { id:'L223', name:'Lunglei',            state:'Mizoram',          lat:22.8878, lon:92.7330, elev:1070 },
  { id:'L224', name:'Champhai',           state:'Mizoram',          lat:23.4667, lon:93.3333, elev:1678 },
  // ── Nagaland ─────────────────────────────────────────────────────────────
  { id:'L225', name:'Kohima',             state:'Nagaland',         lat:25.6700, lon:94.1100, elev:1444 },
  { id:'L226', name:'Dimapur',            state:'Nagaland',         lat:25.9020, lon:93.7278, elev:145  },
  { id:'L227', name:'Mokokchung',         state:'Nagaland',         lat:26.3167, lon:94.5167, elev:1322 },
  { id:'L228', name:'Wokha',              state:'Nagaland',         lat:26.1000, lon:94.2667, elev:1338 },
  // ── Tripura ──────────────────────────────────────────────────────────────
  { id:'L229', name:'Agartala',           state:'Tripura',          lat:23.8315, lon:91.2868, elev:13   },
  { id:'L230', name:'Udaipur (Tripura)',  state:'Tripura',          lat:23.5333, lon:91.4833, elev:15   },
  { id:'L231', name:'Dharmanagar',        state:'Tripura',          lat:24.3667, lon:92.1667, elev:56   },
  // ── Arunachal Pradesh ────────────────────────────────────────────────────
  { id:'L232', name:'Itanagar',           state:'Arunachal Pradesh',lat:27.0844, lon:93.6053, elev:350  },
  { id:'L233', name:'Tawang',             state:'Arunachal Pradesh',lat:27.5861, lon:91.8594, elev:2669 },
  { id:'L234', name:'Pasighat',           state:'Arunachal Pradesh',lat:28.0667, lon:95.3333, elev:153  },
  { id:'L235', name:'Ziro',               state:'Arunachal Pradesh',lat:27.6349, lon:93.8247, elev:1524 },
  { id:'L236', name:'Along (Aalo)',       state:'Arunachal Pradesh',lat:28.1667, lon:94.8000, elev:282  },
  { id:'L237', name:'Tezu',               state:'Arunachal Pradesh',lat:27.9167, lon:96.1667, elev:150  },
  // ── Sikkim ───────────────────────────────────────────────────────────────
  { id:'L238', name:'Gangtok',            state:'Sikkim',           lat:27.3389, lon:88.6065, elev:1547 },
  { id:'L239', name:'Namchi',             state:'Sikkim',           lat:27.1667, lon:88.3667, elev:1350 },
  { id:'L240', name:'Pelling',            state:'Sikkim',           lat:27.3000, lon:88.2000, elev:2150 },
  { id:'L241', name:'Lachung',            state:'Sikkim',           lat:27.6833, lon:88.7500, elev:2750 },
  { id:'L242', name:'Yuksom',             state:'Sikkim',           lat:27.3333, lon:88.2500, elev:1780 },
  // ── Odisha ───────────────────────────────────────────────────────────────
  { id:'L243', name:'Bhubaneswar',        state:'Odisha',           lat:20.2961, lon:85.8245, elev:45   },
  { id:'L244', name:'Cuttack',            state:'Odisha',           lat:20.4625, lon:85.8830, elev:36   },
  { id:'L245', name:'Puri',               state:'Odisha',           lat:19.8106, lon:85.8314, elev:7    },
  { id:'L246', name:'Rourkela',           state:'Odisha',           lat:22.2604, lon:84.8536, elev:219  },
  { id:'L247', name:'Sambalpur',          state:'Odisha',           lat:21.4669, lon:83.9812, elev:160  },
  { id:'L248', name:'Berhampur',          state:'Odisha',           lat:19.3149, lon:84.7941, elev:28   },
  { id:'L249', name:'Koraput',            state:'Odisha',           lat:18.8140, lon:82.7110, elev:859  },
  { id:'L250', name:'Kendujhar',          state:'Odisha',           lat:21.6500, lon:85.5833, elev:398  },
  { id:'L251', name:'Phulbani',           state:'Odisha',           lat:20.4800, lon:84.2300, elev:608  },
  // ── Telangana ────────────────────────────────────────────────────────────
  { id:'L252', name:'Hyderabad',          state:'Telangana',        lat:17.3850, lon:78.4867, elev:542  },
  { id:'L253', name:'Warangal',           state:'Telangana',        lat:17.9784, lon:79.5941, elev:302  },
  { id:'L254', name:'Nizamabad',          state:'Telangana',        lat:18.6725, lon:78.0941, elev:390  },
  { id:'L255', name:'Karimnagar',         state:'Telangana',        lat:18.4386, lon:79.1288, elev:278  },
  { id:'L256', name:'Adilabad',           state:'Telangana',        lat:19.6641, lon:78.5320, elev:256  },
  { id:'L257', name:'Khammam',            state:'Telangana',        lat:17.2473, lon:80.1514, elev:100  },
  // ── Andhra Pradesh ───────────────────────────────────────────────────────
  { id:'L258', name:'Visakhapatnam',      state:'Andhra Pradesh',   lat:17.6868, lon:83.2185, elev:45   },
  { id:'L259', name:'Vijayawada',         state:'Andhra Pradesh',   lat:16.5062, lon:80.6480, elev:26   },
  { id:'L260', name:'Guntur',             state:'Andhra Pradesh',   lat:16.3067, lon:80.4365, elev:25   },
  { id:'L261', name:'Tirupati',           state:'Andhra Pradesh',   lat:13.6288, lon:79.4192, elev:153  },
  { id:'L262', name:'Kurnool',            state:'Andhra Pradesh',   lat:15.8281, lon:78.0373, elev:276  },
  { id:'L263', name:'Rajahmundry',        state:'Andhra Pradesh',   lat:17.0005, lon:81.8040, elev:21   },
  { id:'L264', name:'Araku Valley',       state:'Andhra Pradesh',   lat:18.3330, lon:82.8800, elev:1110 },
  { id:'L265', name:'Horsley Hills',      state:'Andhra Pradesh',   lat:13.6480, lon:78.3980, elev:1265 },
  { id:'L266', name:'Nellore',            state:'Andhra Pradesh',   lat:14.4426, lon:79.9865, elev:16   },
  // ── Karnataka ────────────────────────────────────────────────────────────
  { id:'L267', name:'Bengaluru',          state:'Karnataka',        lat:12.9716, lon:77.5946, elev:920  },
  { id:'L268', name:'Mysuru',             state:'Karnataka',        lat:12.2958, lon:76.6394, elev:770  },
  { id:'L269', name:'Coorg (Madikeri)',   state:'Karnataka',        lat:12.3375, lon:75.8069, elev:1083 },
  { id:'L270', name:'Mangaluru',          state:'Karnataka',        lat:12.9141, lon:74.8560, elev:22   },
  { id:'L271', name:'Hubballi-Dharwad',   state:'Karnataka',        lat:15.3647, lon:75.1240, elev:670  },
  { id:'L272', name:'Belagavi',           state:'Karnataka',        lat:15.8497, lon:74.4977, elev:751  },
  { id:'L273', name:'Chikmagalur',        state:'Karnataka',        lat:13.3161, lon:75.7720, elev:1090 },
  { id:'L274', name:'Shivamogga',         state:'Karnataka',        lat:13.9299, lon:75.5681, elev:575  },
  { id:'L275', name:'Ballari',            state:'Karnataka',        lat:15.1394, lon:76.9214, elev:468  },
  { id:'L276', name:'Bidar',              state:'Karnataka',        lat:17.9104, lon:77.5199, elev:664  },
  { id:'L277', name:'Udupi',              state:'Karnataka',        lat:13.3409, lon:74.7421, elev:12   },
  { id:'L278', name:'Hassan',             state:'Karnataka',        lat:13.0068, lon:76.1004, elev:915  },
  { id:'L279', name:'Agumbe',             state:'Karnataka',        lat:13.5000, lon:75.0833, elev:820  },
  { id:'L280', name:'Sakleshpur',         state:'Karnataka',        lat:12.9510, lon:75.7880, elev:900  },
  // ── Tamil Nadu ───────────────────────────────────────────────────────────
  { id:'L281', name:'Chennai',            state:'Tamil Nadu',       lat:13.0827, lon:80.2707, elev:6    },
  { id:'L282', name:'Coimbatore',         state:'Tamil Nadu',       lat:11.0168, lon:76.9558, elev:411  },
  { id:'L283', name:'Madurai',            state:'Tamil Nadu',       lat:9.9252,  lon:78.1198, elev:101  },
  { id:'L284', name:'Tiruchirappalli',    state:'Tamil Nadu',       lat:10.7905, lon:78.7047, elev:88   },
  { id:'L285', name:'Salem',              state:'Tamil Nadu',       lat:11.6643, lon:78.1460, elev:278  },
  { id:'L286', name:'Ooty',               state:'Tamil Nadu',       lat:11.4102, lon:76.6950, elev:2240 },
  { id:'L287', name:'Tirunelveli',        state:'Tamil Nadu',       lat:8.7139,  lon:77.7567, elev:47   },
  { id:'L288', name:'Vellore',            state:'Tamil Nadu',       lat:12.9165, lon:79.1325, elev:215  },
  { id:'L289', name:'Thanjavur',          state:'Tamil Nadu',       lat:10.7870, lon:79.1378, elev:58   },
  { id:'L290', name:'Kanyakumari',        state:'Tamil Nadu',       lat:8.0883,  lon:77.5385, elev:5    },
  { id:'L291', name:'Kodaikanal',         state:'Tamil Nadu',       lat:10.2381, lon:77.4892, elev:2133 },
  { id:'L292', name:'Yercaud',            state:'Tamil Nadu',       lat:11.7745, lon:78.2107, elev:1515 },
  { id:'L293', name:'Valparai',           state:'Tamil Nadu',       lat:10.3270, lon:76.9550, elev:1000 },
  { id:'L294', name:'Dindigul',           state:'Tamil Nadu',       lat:10.3624, lon:77.9695, elev:294  },
  // ── Kerala ───────────────────────────────────────────────────────────────
  { id:'L295', name:'Thiruvananthapuram', state:'Kerala',           lat:8.5241,  lon:76.9366, elev:64   },
  { id:'L296', name:'Kochi',              state:'Kerala',           lat:9.9312,  lon:76.2673, elev:3    },
  { id:'L297', name:'Munnar',             state:'Kerala',           lat:10.0889, lon:77.0595, elev:1600 },
  { id:'L298', name:'Kozhikode',          state:'Kerala',           lat:11.2588, lon:75.7804, elev:5    },
  { id:'L299', name:'Thrissur',           state:'Kerala',           lat:10.5276, lon:76.2144, elev:2    },
  { id:'L300', name:'Kollam',             state:'Kerala',           lat:8.8932,  lon:76.6141, elev:6    },
  { id:'L301', name:'Palakkad',           state:'Kerala',           lat:10.7867, lon:76.6548, elev:80   },
  { id:'L302', name:'Idukki',             state:'Kerala',           lat:9.8500,  lon:77.0000, elev:750  },
  { id:'L303', name:'Wayanad',            state:'Kerala',           lat:11.6854, lon:76.1320, elev:900  },
  { id:'L304', name:'Kannur',             state:'Kerala',           lat:11.8745, lon:75.3704, elev:6    },
  { id:'L305', name:'Alappuzha',          state:'Kerala',           lat:9.4981,  lon:76.3388, elev:2    },
  { id:'L306', name:'Kottayam',           state:'Kerala',           lat:9.5916,  lon:76.5222, elev:3    },
  { id:'L307', name:'Kasaragod',          state:'Kerala',           lat:12.4996, lon:74.9869, elev:14   },
  // ── Goa ──────────────────────────────────────────────────────────────────
  { id:'L308', name:'Panaji',             state:'Goa',              lat:15.4909, lon:73.8278, elev:7    },
  { id:'L309', name:'Margao',             state:'Goa',              lat:15.2832, lon:73.9862, elev:6    },
  { id:'L310', name:'Vasco da Gama',      state:'Goa',              lat:15.3982, lon:73.8113, elev:5    },
  // ── Andaman & Nicobar ────────────────────────────────────────────────────
  { id:'L311', name:'Port Blair',         state:'Andaman & Nicobar',lat:11.6234, lon:92.7265, elev:16   },
  { id:'L312', name:'Car Nicobar',        state:'Andaman & Nicobar',lat:9.1500,  lon:92.8167, elev:5    },
  { id:'L313', name:'Diglipur',           state:'Andaman & Nicobar',lat:13.2667, lon:92.9833, elev:8    },
  // ── Lakshadweep ──────────────────────────────────────────────────────────
  { id:'L314', name:'Kavaratti',          state:'Lakshadweep',      lat:10.5626, lon:72.6369, elev:4    },
  { id:'L315', name:'Agatti Island',      state:'Lakshadweep',      lat:10.8464, lon:72.1894, elev:3    },
  // ── Puducherry ───────────────────────────────────────────────────────────
  { id:'L316', name:'Puducherry',         state:'Puducherry',       lat:11.9416, lon:79.8083, elev:4    },
  { id:'L317', name:'Karaikal',           state:'Puducherry',       lat:10.9254, lon:79.8380, elev:3    },
  // ── Daman & Diu / Dadra ──────────────────────────────────────────────────
  { id:'L318', name:'Daman',              state:'Daman & Diu',      lat:20.3974, lon:72.8328, elev:7    },
  { id:'L319', name:'Silvassa',           state:'Dadra & NH',       lat:20.2740, lon:73.0169, elev:70   },
  // ── Jammu & Kashmir extra ────────────────────────────────────────────────
  { id:'L320', name:'Bhaderwah',          state:'Jammu & Kashmir',  lat:32.9780, lon:75.7280, elev:1604 },
  { id:'L321', name:'Ramban',             state:'Jammu & Kashmir',  lat:33.2370, lon:75.2390, elev:786  },
  { id:'L322', name:'Gurez Valley',       state:'Jammu & Kashmir',  lat:34.6300, lon:74.8500, elev:2400 },

  // ── Punjab — all 23 districts ───────────────────────────────────────────
  { id:'P001', name:'Amritsar',           state:'Punjab',           lat:31.6340, lon:74.8723, elev:234  },
  { id:'P002', name:'Ludhiana',           state:'Punjab',           lat:30.9010, lon:75.8573, elev:244  },
  { id:'P003', name:'Jalandhar',          state:'Punjab',           lat:31.3260, lon:75.5762, elev:228  },
  { id:'P004', name:'Patiala',            state:'Punjab',           lat:30.3398, lon:76.3869, elev:250  },
  { id:'P005', name:'Bathinda',           state:'Punjab',           lat:30.2110, lon:74.9455, elev:211  },
  { id:'P006', name:'Mohali (SAS Nagar)', state:'Punjab',           lat:30.7046, lon:76.7179, elev:310  },
  { id:'P007', name:'Pathankot',          state:'Punjab',           lat:32.2742, lon:75.6522, elev:322  },
  { id:'P008', name:'Hoshiarpur',         state:'Punjab',           lat:31.5143, lon:75.9115, elev:280  },
  { id:'P009', name:'Gurdaspur',          state:'Punjab',           lat:32.0405, lon:75.4065, elev:290  },
  { id:'P010', name:'Ropar (Rupnagar)',   state:'Punjab',           lat:30.9649, lon:76.5282, elev:296  },
  { id:'P011', name:'Firozpur',           state:'Punjab',           lat:30.9254, lon:74.6130, elev:185  },
  { id:'P012', name:'Sangrur',            state:'Punjab',           lat:30.2456, lon:75.8466, elev:225  },
  { id:'P013', name:'Moga',               state:'Punjab',           lat:30.8168, lon:75.1736, elev:212  },
  { id:'P014', name:'Fatehgarh Sahib',    state:'Punjab',           lat:30.6490, lon:76.3880, elev:247  },
  { id:'P015', name:'Muktsar',            state:'Punjab',           lat:30.4752, lon:74.5164, elev:189  },
  { id:'P016', name:'Fazilka',            state:'Punjab',           lat:30.4010, lon:74.0266, elev:175  },
  { id:'P017', name:'Ferozepur',          state:'Punjab',           lat:30.9254, lon:74.6130, elev:185  },
  { id:'P018', name:'Nawanshahr',         state:'Punjab',           lat:31.1255, lon:76.1162, elev:320  },
  { id:'P019', name:'Kapurthala',         state:'Punjab',           lat:31.3800, lon:75.3800, elev:225  },
  { id:'P020', name:'Tarn Taran',         state:'Punjab',           lat:31.4500, lon:74.9300, elev:225  },
  { id:'P021', name:'Barnala',            state:'Punjab',           lat:30.3790, lon:75.5480, elev:230  },
  { id:'P022', name:'Mansa',              state:'Punjab',           lat:29.9900, lon:75.3900, elev:215  },
  { id:'P023', name:'Malerkotla',         state:'Punjab',           lat:30.5300, lon:75.8800, elev:235  },
  // ── Haryana — all 22 districts ───────────────────────────────────────────
  { id:'H001', name:'Ambala',             state:'Haryana',          lat:30.3782, lon:76.7767, elev:270  },
  { id:'H002', name:'Panchkula',          state:'Haryana',          lat:30.6942, lon:76.8606, elev:365  },
  { id:'H003', name:'Yamunanagar',        state:'Haryana',          lat:30.1290, lon:77.2674, elev:282  },
  { id:'H004', name:'Karnal',             state:'Haryana',          lat:29.6857, lon:76.9905, elev:250  },
  { id:'H005', name:'Kurukshetra',        state:'Haryana',          lat:29.9695, lon:76.8783, elev:253  },
  { id:'H006', name:'Panipat',            state:'Haryana',          lat:29.3909, lon:76.9635, elev:226  },
  { id:'H007', name:'Sonipat',            state:'Haryana',          lat:28.9931, lon:77.0151, elev:226  },
  { id:'H008', name:'Rohtak',             state:'Haryana',          lat:28.8955, lon:76.6066, elev:220  },
  { id:'H009', name:'Jhajjar',            state:'Haryana',          lat:28.6080, lon:76.6570, elev:220  },
  { id:'H010', name:'Gurugram',           state:'Haryana',          lat:28.4595, lon:77.0266, elev:217  },
  { id:'H011', name:'Faridabad',          state:'Haryana',          lat:28.4089, lon:77.3178, elev:198  },
  { id:'H012', name:'Palwal',             state:'Haryana',          lat:28.1440, lon:77.3290, elev:205  },
  { id:'H013', name:'Nuh (Mewat)',        state:'Haryana',          lat:28.1068, lon:77.0000, elev:219  },
  { id:'H014', name:'Rewari',             state:'Haryana',          lat:28.1980, lon:76.6170, elev:245  },
  { id:'H015', name:'Mahendragarh',       state:'Haryana',          lat:28.2780, lon:76.1490, elev:300  },
  { id:'H016', name:'Bhiwani',            state:'Haryana',          lat:28.7980, lon:76.1340, elev:220  },
  { id:'H017', name:'Charkhi Dadri',      state:'Haryana',          lat:28.5920, lon:76.2710, elev:225  },
  { id:'H018', name:'Hisar',              state:'Haryana',          lat:29.1492, lon:75.7217, elev:215  },
  { id:'H019', name:'Fatehabad',          state:'Haryana',          lat:29.5170, lon:75.4570, elev:210  },
  { id:'H020', name:'Sirsa',              state:'Haryana',          lat:29.5330, lon:75.0234, elev:206  },
  { id:'H021', name:'Jind',               state:'Haryana',          lat:29.3160, lon:76.3150, elev:218  },
  { id:'H022', name:'Kaithal',            state:'Haryana',          lat:29.8010, lon:76.3990, elev:232  },
  // ── Himachal Pradesh — all 12 districts ──────────────────────────────────
  { id:'HP01', name:'Shimla (district)',  state:'Himachal Pradesh', lat:31.1048, lon:77.1734, elev:2202 },
  { id:'HP02', name:'Kullu (district)',   state:'Himachal Pradesh', lat:31.9579, lon:77.1095, elev:1219 },
  { id:'HP03', name:'Manali',             state:'Himachal Pradesh', lat:32.2190, lon:77.1890, elev:2050 },
  { id:'HP04', name:'Mandi (district)',   state:'Himachal Pradesh', lat:31.7080, lon:76.9318, elev:800  },
  { id:'HP05', name:'Dharamshala',        state:'Himachal Pradesh', lat:32.2190, lon:76.3234, elev:1457 },
  { id:'HP06', name:'Kangra (district)',  state:'Himachal Pradesh', lat:32.0998, lon:76.2691, elev:733  },
  { id:'HP07', name:'Chamba (district)',  state:'Himachal Pradesh', lat:32.5534, lon:76.1258, elev:996  },
  { id:'HP08', name:'Solan (district)',   state:'Himachal Pradesh', lat:30.9045, lon:77.0967, elev:1350 },
  { id:'HP09', name:'Sirmaur (Nahan)',    state:'Himachal Pradesh', lat:30.5595, lon:77.2956, elev:932  },
  { id:'HP10', name:'Bilaspur (district)',state:'Himachal Pradesh', lat:31.3390, lon:76.7605, elev:673  },
  { id:'HP11', name:'Hamirpur (district)',state:'Himachal Pradesh', lat:31.6862, lon:76.5215, elev:786  },
  { id:'HP12', name:'Una (district)',     state:'Himachal Pradesh', lat:31.4685, lon:76.2694, elev:370  },
  { id:'HP13', name:'Kinnaur (district)', state:'Himachal Pradesh', lat:31.5926, lon:78.0049, elev:2320 },
  { id:'HP14', name:'Lahaul & Spiti',     state:'Himachal Pradesh', lat:32.5700, lon:77.5800, elev:3300 },
  { id:'HP15', name:'Spiti Valley',       state:'Himachal Pradesh', lat:32.2461, lon:78.0338, elev:3800 },
  { id:'HP16', name:'Dalhousie',          state:'Himachal Pradesh', lat:32.5390, lon:75.9740, elev:2036 },
  { id:'HP17', name:'Palampur',           state:'Himachal Pradesh', lat:32.1100, lon:76.5370, elev:1472 },
  { id:'HP18', name:'Narkanda',           state:'Himachal Pradesh', lat:31.2710, lon:77.4490, elev:2708 },
  { id:'HP19', name:'Kufri',              state:'Himachal Pradesh', lat:31.0985, lon:77.2636, elev:2600 },
  { id:'HP20', name:'Kasauli',            state:'Himachal Pradesh', lat:30.8991, lon:76.9659, elev:1795 },
  { id:'HP21', name:'Rohtang Pass',       state:'Himachal Pradesh', lat:32.3688, lon:77.2445, elev:3978 },
  { id:'HP22', name:'Recong Peo',         state:'Himachal Pradesh', lat:31.5374, lon:78.2703, elev:2290 },
  { id:'HP23', name:'Rampur Bushahr',     state:'Himachal Pradesh', lat:31.4488, lon:77.6333, elev:975  },
  // ── Uttarakhand — all 13 districts ───────────────────────────────────────
  { id:'UK01', name:'Dehradun',           state:'Uttarakhand',      lat:30.3165, lon:78.0322, elev:640  },
  { id:'UK02', name:'Haridwar',           state:'Uttarakhand',      lat:29.9457, lon:78.1642, elev:314  },
  { id:'UK03', name:'Pauri Garhwal',      state:'Uttarakhand',      lat:30.1458, lon:78.7798, elev:1650 },
  { id:'UK04', name:'Tehri Garhwal',      state:'Uttarakhand',      lat:30.3780, lon:78.4800, elev:770  },
  { id:'UK05', name:'Uttarkashi',         state:'Uttarakhand',      lat:30.7268, lon:78.4354, elev:1158 },
  { id:'UK06', name:'Chamoli',            state:'Uttarakhand',      lat:30.4021, lon:79.3256, elev:1300 },
  { id:'UK07', name:'Rudraprayag',        state:'Uttarakhand',      lat:30.2847, lon:78.9814, elev:895  },
  { id:'UK08', name:'Nainital',           state:'Uttarakhand',      lat:29.3803, lon:79.4636, elev:2084 },
  { id:'UK09', name:'Almora',             state:'Uttarakhand',      lat:29.5971, lon:79.6591, elev:1638 },
  { id:'UK10', name:'Pithoragarh',        state:'Uttarakhand',      lat:29.5829, lon:80.2181, elev:1814 },
  { id:'UK11', name:'Bageshwar',          state:'Uttarakhand',      lat:29.8380, lon:79.7690, elev:960  },
  { id:'UK12', name:'Champawat',          state:'Uttarakhand',      lat:29.3330, lon:80.0910, elev:1616 },
  { id:'UK13', name:'Udham Singh Nagar',  state:'Uttarakhand',      lat:28.9990, lon:79.5170, elev:244  },
  { id:'UK14', name:'Mussoorie',          state:'Uttarakhand',      lat:30.4598, lon:78.0644, elev:2005 },
  { id:'UK15', name:'Rishikesh',          state:'Uttarakhand',      lat:30.0869, lon:78.2676, elev:372  },
  { id:'UK16', name:'Kedarnath',          state:'Uttarakhand',      lat:30.7346, lon:79.0669, elev:3584 },
  { id:'UK17', name:'Badrinath',          state:'Uttarakhand',      lat:30.7433, lon:79.4938, elev:3300 },
  { id:'UK18', name:'Haldwani',           state:'Uttarakhand',      lat:29.2183, lon:79.5130, elev:424  },
  { id:'UK19', name:'Ranikhet',           state:'Uttarakhand',      lat:29.6400, lon:79.4300, elev:1829 },
  { id:'UK20', name:'Lansdowne',          state:'Uttarakhand',      lat:29.8376, lon:78.6868, elev:1706 },
  { id:'UK21', name:'Chakrata',           state:'Uttarakhand',      lat:30.6918, lon:77.8680, elev:2118 },
  { id:'UK22', name:'Roorkee',            state:'Uttarakhand',      lat:29.8543, lon:77.8880, elev:268  },
  // ── Uttar Pradesh — all 75 districts (major ones) ─────────────────────────
  { id:'UP01', name:'Lucknow',            state:'Uttar Pradesh',    lat:26.8467, lon:80.9462, elev:123  },
  { id:'UP02', name:'Agra',               state:'Uttar Pradesh',    lat:27.1767, lon:78.0081, elev:169  },
  { id:'UP03', name:'Varanasi',           state:'Uttar Pradesh',    lat:25.3176, lon:82.9739, elev:80   },
  { id:'UP04', name:'Kanpur',             state:'Uttar Pradesh',    lat:26.4499, lon:80.3319, elev:126  },
  { id:'UP05', name:'Prayagraj',          state:'Uttar Pradesh',    lat:25.4358, lon:81.8463, elev:98   },
  { id:'UP06', name:'Meerut',             state:'Uttar Pradesh',    lat:28.9845, lon:77.7064, elev:225  },
  { id:'UP07', name:'Noida',              state:'Uttar Pradesh',    lat:28.5355, lon:77.3910, elev:198  },
  { id:'UP08', name:'Ghaziabad',          state:'Uttar Pradesh',    lat:28.6692, lon:77.4538, elev:200  },
  { id:'UP09', name:'Bareilly',           state:'Uttar Pradesh',    lat:28.3670, lon:79.4304, elev:173  },
  { id:'UP10', name:'Moradabad',          state:'Uttar Pradesh',    lat:28.8386, lon:78.7733, elev:186  },
  { id:'UP11', name:'Gorakhpur',          state:'Uttar Pradesh',    lat:26.7606, lon:83.3732, elev:84   },
  { id:'UP12', name:'Aligarh',            state:'Uttar Pradesh',    lat:27.8974, lon:78.0880, elev:178  },
  { id:'UP13', name:'Muzaffarnagar',      state:'Uttar Pradesh',    lat:29.4727, lon:77.7085, elev:271  },
  { id:'UP14', name:'Saharanpur',         state:'Uttar Pradesh',    lat:29.9680, lon:77.5510, elev:274  },
  { id:'UP15', name:'Mathura',            state:'Uttar Pradesh',    lat:27.4924, lon:77.6737, elev:174  },
  { id:'UP16', name:'Firozabad',          state:'Uttar Pradesh',    lat:27.1490, lon:78.3950, elev:175  },
  { id:'UP17', name:'Hathras',            state:'Uttar Pradesh',    lat:27.5960, lon:78.0530, elev:178  },
  { id:'UP18', name:'Etawah',             state:'Uttar Pradesh',    lat:26.7800, lon:79.0200, elev:146  },
  { id:'UP19', name:'Mainpuri',           state:'Uttar Pradesh',    lat:27.2340, lon:79.0260, elev:152  },
  { id:'UP20', name:'Etah',               state:'Uttar Pradesh',    lat:27.5600, lon:78.6600, elev:173  },
  { id:'UP21', name:'Farrukhabad',        state:'Uttar Pradesh',    lat:27.3900, lon:79.5800, elev:142  },
  { id:'UP22', name:'Kannauj',            state:'Uttar Pradesh',    lat:27.0650, lon:79.9150, elev:136  },
  { id:'UP23', name:'Unnao',              state:'Uttar Pradesh',    lat:26.5460, lon:80.4980, elev:126  },
  { id:'UP24', name:'Rae Bareli',         state:'Uttar Pradesh',    lat:26.2300, lon:81.2350, elev:112  },
  { id:'UP25', name:'Sitapur',            state:'Uttar Pradesh',    lat:27.5670, lon:80.6830, elev:139  },
  { id:'UP26', name:'Hardoi',             state:'Uttar Pradesh',    lat:27.3950, lon:80.1270, elev:134  },
  { id:'UP27', name:'Shahjahanpur',       state:'Uttar Pradesh',    lat:27.8800, lon:79.9050, elev:168  },
  { id:'UP28', name:'Pilibhit',           state:'Uttar Pradesh',    lat:28.6320, lon:79.8040, elev:177  },
  { id:'UP29', name:'Lakhimpur Kheri',    state:'Uttar Pradesh',    lat:27.9470, lon:80.7770, elev:143  },
  { id:'UP30', name:'Bahraich',           state:'Uttar Pradesh',    lat:27.5750, lon:81.5940, elev:114  },
  { id:'UP31', name:'Shravasti',          state:'Uttar Pradesh',    lat:27.5810, lon:81.8090, elev:110  },
  { id:'UP32', name:'Balrampur',          state:'Uttar Pradesh',    lat:27.4250, lon:82.1570, elev:115  },
  { id:'UP33', name:'Gonda',              state:'Uttar Pradesh',    lat:27.1333, lon:81.9667, elev:106  },
  { id:'UP34', name:'Faizabad (Ayodhya)', state:'Uttar Pradesh',    lat:26.7922, lon:82.1998, elev:93   },
  { id:'UP35', name:'Sultanpur',          state:'Uttar Pradesh',    lat:26.2630, lon:82.0720, elev:99   },
  { id:'UP36', name:'Ambedkar Nagar',     state:'Uttar Pradesh',    lat:26.4450, lon:82.5350, elev:100  },
  { id:'UP37', name:'Azamgarh',           state:'Uttar Pradesh',    lat:26.0680, lon:83.1840, elev:70   },
  { id:'UP38', name:'Mau',                state:'Uttar Pradesh',    lat:25.9430, lon:83.5610, elev:69   },
  { id:'UP39', name:'Ballia',             state:'Uttar Pradesh',    lat:25.7600, lon:84.1480, elev:62   },
  { id:'UP40', name:'Deoria',             state:'Uttar Pradesh',    lat:26.5030, lon:83.7800, elev:75   },
  { id:'UP41', name:'Kushinagar',         state:'Uttar Pradesh',    lat:26.7400, lon:83.8900, elev:74   },
  { id:'UP42', name:'Maharajganj',        state:'Uttar Pradesh',    lat:27.1300, lon:83.5600, elev:91   },
  { id:'UP43', name:'Siddharthnagar',     state:'Uttar Pradesh',    lat:27.2960, lon:83.0700, elev:99   },
  { id:'UP44', name:'Basti',              state:'Uttar Pradesh',    lat:26.8030, lon:82.7280, elev:100  },
  { id:'UP45', name:'Sant Kabir Nagar',   state:'Uttar Pradesh',    lat:26.7870, lon:83.0570, elev:94   },
  { id:'UP46', name:'Jaunpur',            state:'Uttar Pradesh',    lat:25.7500, lon:82.6840, elev:79   },
  { id:'UP47', name:'Ghazipur',           state:'Uttar Pradesh',    lat:25.5800, lon:83.5780, elev:66   },
  { id:'UP48', name:'Chandauli',          state:'Uttar Pradesh',    lat:25.2650, lon:83.2690, elev:75   },
  { id:'UP49', name:'Mirzapur',           state:'Uttar Pradesh',    lat:25.1450, lon:82.5690, elev:88   },
  { id:'UP50', name:'Sonbhadra',          state:'Uttar Pradesh',    lat:24.6890, lon:82.9920, elev:280  },
  { id:'UP51', name:'Banda',              state:'Uttar Pradesh',    lat:25.4760, lon:80.3350, elev:130  },
  { id:'UP52', name:'Chitrakoot',         state:'Uttar Pradesh',    lat:25.1990, lon:80.8810, elev:150  },
  { id:'UP53', name:'Hamirpur (UP)',      state:'Uttar Pradesh',    lat:25.9500, lon:80.1500, elev:120  },
  { id:'UP54', name:'Mahoba',             state:'Uttar Pradesh',    lat:25.2900, lon:79.8700, elev:213  },
  { id:'UP55', name:'Jhansi',             state:'Uttar Pradesh',    lat:25.4484, lon:78.5685, elev:285  },
  { id:'UP56', name:'Lalitpur',           state:'Uttar Pradesh',    lat:24.6890, lon:78.4130, elev:415  },
  { id:'UP57', name:'Jalaun',             state:'Uttar Pradesh',    lat:26.1460, lon:79.3320, elev:150  },
  { id:'UP58', name:'Rampur',             state:'Uttar Pradesh',    lat:28.8130, lon:79.0260, elev:191  },
  { id:'UP59', name:'Sambhal',            state:'Uttar Pradesh',    lat:28.5930, lon:78.5510, elev:195  },
  { id:'UP60', name:'Amroha',             state:'Uttar Pradesh',    lat:28.9050, lon:78.4670, elev:210  },
  { id:'UP61', name:'Hapur',              state:'Uttar Pradesh',    lat:28.7270, lon:77.7750, elev:206  },
  { id:'UP62', name:'Bulandshahr',        state:'Uttar Pradesh',    lat:28.4070, lon:77.8490, elev:203  },
  { id:'UP63', name:'Gautam Buddha Nagar',state:'Uttar Pradesh',    lat:28.5000, lon:77.5000, elev:200  },
  { id:'UP64', name:'Bijnor',             state:'Uttar Pradesh',    lat:29.3730, lon:78.1350, elev:232  },
  { id:'UP65', name:'Amroha (Jyotiba)',   state:'Uttar Pradesh',    lat:28.9050, lon:78.4670, elev:210  },
  { id:'UP66', name:'Pratabgarh',         state:'Uttar Pradesh',    lat:25.9000, lon:81.9900, elev:96   },
  // ── Rajasthan — all 33 districts ─────────────────────────────────────────
  { id:'RJ01', name:'Jaipur',             state:'Rajasthan',        lat:26.9124, lon:75.7873, elev:431  },
  { id:'RJ02', name:'Jodhpur',            state:'Rajasthan',        lat:26.2389, lon:73.0243, elev:231  },
  { id:'RJ03', name:'Udaipur',            state:'Rajasthan',        lat:24.5854, lon:73.7125, elev:598  },
  { id:'RJ04', name:'Kota',               state:'Rajasthan',        lat:25.2138, lon:75.8648, elev:271  },
  { id:'RJ05', name:'Ajmer',              state:'Rajasthan',        lat:26.4499, lon:74.6399, elev:486  },
  { id:'RJ06', name:'Bikaner',            state:'Rajasthan',        lat:28.0229, lon:73.3119, elev:234  },
  { id:'RJ07', name:'Alwar',              state:'Rajasthan',        lat:27.5530, lon:76.6346, elev:271  },
  { id:'RJ08', name:'Bharatpur',          state:'Rajasthan',        lat:27.2152, lon:77.4902, elev:178  },
  { id:'RJ09', name:'Sikar',              state:'Rajasthan',        lat:27.6094, lon:75.1397, elev:427  },
  { id:'RJ10', name:'Mount Abu',          state:'Rajasthan',        lat:24.5926, lon:72.7156, elev:1220 },
  { id:'RJ11', name:'Jaisalmer',          state:'Rajasthan',        lat:26.9157, lon:70.9083, elev:225  },
  { id:'RJ12', name:'Barmer',             state:'Rajasthan',        lat:25.7463, lon:71.3942, elev:207  },
  { id:'RJ13', name:'Nagaur',             state:'Rajasthan',        lat:27.2030, lon:73.7290, elev:336  },
  { id:'RJ14', name:'Pali',               state:'Rajasthan',        lat:25.7710, lon:73.3240, elev:215  },
  { id:'RJ15', name:'Sirohi',             state:'Rajasthan',        lat:24.8880, lon:72.8620, elev:320  },
  { id:'RJ16', name:'Jalore',             state:'Rajasthan',        lat:25.3470, lon:72.6160, elev:178  },
  { id:'RJ17', name:'Dungarpur',          state:'Rajasthan',        lat:23.8430, lon:73.7156, elev:290  },
  { id:'RJ18', name:'Banswara',           state:'Rajasthan',        lat:23.5470, lon:74.4470, elev:264  },
  { id:'RJ19', name:'Chittorgarh',        state:'Rajasthan',        lat:24.8887, lon:74.6269, elev:394  },
  { id:'RJ20', name:'Bhilwara',           state:'Rajasthan',        lat:25.3470, lon:74.6350, elev:412  },
  { id:'RJ21', name:'Rajsamand',          state:'Rajasthan',        lat:25.0700, lon:73.8820, elev:468  },
  { id:'RJ22', name:'Pratapgarh',         state:'Rajasthan',        lat:24.0290, lon:74.7780, elev:361  },
  { id:'RJ23', name:'Tonk',               state:'Rajasthan',        lat:26.1650, lon:75.7900, elev:264  },
  { id:'RJ24', name:'Sawai Madhopur',     state:'Rajasthan',        lat:25.9960, lon:76.3530, elev:266  },
  { id:'RJ25', name:'Karauli',            state:'Rajasthan',        lat:26.5050, lon:77.0200, elev:251  },
  { id:'RJ26', name:'Dhaulpur',           state:'Rajasthan',        lat:26.6990, lon:77.8920, elev:176  },
  { id:'RJ27', name:'Jhalawar',           state:'Rajasthan',        lat:23.6270, lon:76.1590, elev:367  },
  { id:'RJ28', name:'Baran',              state:'Rajasthan',        lat:25.1000, lon:76.5180, elev:262  },
  { id:'RJ29', name:'Bundi',              state:'Rajasthan',        lat:25.4360, lon:75.6410, elev:272  },
  { id:'RJ30', name:'Jhunjhunu',          state:'Rajasthan',        lat:28.1290, lon:75.3980, elev:343  },
  { id:'RJ31', name:'Churu',              state:'Rajasthan',        lat:28.2990, lon:74.9690, elev:304  },
  { id:'RJ32', name:'Hanumangarh',        state:'Rajasthan',        lat:29.5790, lon:74.3300, elev:219  },
  { id:'RJ33', name:'Ganganagar',         state:'Rajasthan',        lat:29.9130, lon:73.8780, elev:178  },
  // ── Madhya Pradesh — all 52 districts (key ones) ─────────────────────────
  { id:'MP01', name:'Bhopal',             state:'Madhya Pradesh',   lat:23.2599, lon:77.4126, elev:527  },
  { id:'MP02', name:'Indore',             state:'Madhya Pradesh',   lat:22.7196, lon:75.8577, elev:553  },
  { id:'MP03', name:'Gwalior',            state:'Madhya Pradesh',   lat:26.2183, lon:78.1828, elev:197  },
  { id:'MP04', name:'Jabalpur',           state:'Madhya Pradesh',   lat:23.1815, lon:79.9864, elev:412  },
  { id:'MP05', name:'Ujjain',             state:'Madhya Pradesh',   lat:23.1765, lon:75.7885, elev:491  },
  { id:'MP06', name:'Sagar',              state:'Madhya Pradesh',   lat:23.8388, lon:78.7378, elev:520  },
  { id:'MP07', name:'Rewa',               state:'Madhya Pradesh',   lat:24.5362, lon:81.2961, elev:360  },
  { id:'MP08', name:'Satna',              state:'Madhya Pradesh',   lat:24.5694, lon:80.8322, elev:320  },
  { id:'MP09', name:'Pachmarhi',          state:'Madhya Pradesh',   lat:22.4674, lon:78.4338, elev:1067 },
  { id:'MP10', name:'Chhindwara',         state:'Madhya Pradesh',   lat:22.0570, lon:78.9390, elev:679  },
  { id:'MP11', name:'Seoni',              state:'Madhya Pradesh',   lat:22.0840, lon:79.5500, elev:564  },
  { id:'MP12', name:'Mandla',             state:'Madhya Pradesh',   lat:22.5990, lon:80.3740, elev:462  },
  { id:'MP13', name:'Dindori',            state:'Madhya Pradesh',   lat:22.9480, lon:81.0790, elev:640  },
  { id:'MP14', name:'Shahdol',            state:'Madhya Pradesh',   lat:23.2990, lon:81.3570, elev:440  },
  { id:'MP15', name:'Umaria',             state:'Madhya Pradesh',   lat:23.5220, lon:80.8360, elev:436  },
  { id:'MP16', name:'Katni',              state:'Madhya Pradesh',   lat:23.8290, lon:80.3900, elev:390  },
  { id:'MP17', name:'Narsinghpur',        state:'Madhya Pradesh',   lat:22.9450, lon:79.1940, elev:360  },
  { id:'MP18', name:'Raisen',             state:'Madhya Pradesh',   lat:23.3290, lon:77.7870, elev:470  },
  { id:'MP19', name:'Vidisha',            state:'Madhya Pradesh',   lat:23.5250, lon:77.8090, elev:440  },
  { id:'MP20', name:'Guna',               state:'Madhya Pradesh',   lat:24.6480, lon:77.3140, elev:478  },
  { id:'MP21', name:'Shivpuri',           state:'Madhya Pradesh',   lat:25.4220, lon:77.6590, elev:476  },
  { id:'MP22', name:'Datia',              state:'Madhya Pradesh',   lat:25.6710, lon:78.4570, elev:250  },
  { id:'MP23', name:'Bhind',              state:'Madhya Pradesh',   lat:26.5650, lon:78.7870, elev:175  },
  { id:'MP24', name:'Morena',             state:'Madhya Pradesh',   lat:26.5000, lon:77.9990, elev:193  },
  { id:'MP25', name:'Dewas',              state:'Madhya Pradesh',   lat:22.9620, lon:76.0520, elev:541  },
  { id:'MP26', name:'Shajapur',           state:'Madhya Pradesh',   lat:23.4240, lon:76.2780, elev:494  },
  { id:'MP27', name:'Rajgarh',            state:'Madhya Pradesh',   lat:23.8420, lon:76.7290, elev:431  },
  { id:'MP28', name:'Mandsaur',           state:'Madhya Pradesh',   lat:24.0730, lon:75.0700, elev:403  },
  { id:'MP29', name:'Neemuch',            state:'Madhya Pradesh',   lat:24.4770, lon:74.8690, elev:459  },
  { id:'MP30', name:'Ratlam',             state:'Madhya Pradesh',   lat:23.3340, lon:75.0380, elev:495  },
  { id:'MP31', name:'Jhabua',             state:'Madhya Pradesh',   lat:22.7660, lon:74.5960, elev:296  },
  { id:'MP32', name:'Alirajpur',          state:'Madhya Pradesh',   lat:22.3140, lon:74.3580, elev:290  },
  { id:'MP33', name:'Barwani',            state:'Madhya Pradesh',   lat:22.0350, lon:74.9040, elev:175  },
  { id:'MP34', name:'Dhar',               state:'Madhya Pradesh',   lat:22.6010, lon:75.3040, elev:556  },
  { id:'MP35', name:'Khargone',           state:'Madhya Pradesh',   lat:21.8250, lon:75.6110, elev:283  },
  { id:'MP36', name:'Khandwa',            state:'Madhya Pradesh',   lat:21.8290, lon:76.3560, elev:299  },
  { id:'MP37', name:'Burhanpur',          state:'Madhya Pradesh',   lat:21.3090, lon:76.2270, elev:265  },
  { id:'MP38', name:'Betul',              state:'Madhya Pradesh',   lat:21.9080, lon:77.8980, elev:651  },
  { id:'MP39', name:'Hoshangabad',        state:'Madhya Pradesh',   lat:22.7510, lon:77.7200, elev:330  },
  { id:'MP40', name:'Harda',              state:'Madhya Pradesh',   lat:22.3390, lon:77.0920, elev:303  },
  // ── Maharashtra — all 36 districts ───────────────────────────────────────
  { id:'MH01', name:'Mumbai City',        state:'Maharashtra',      lat:18.9389, lon:72.8356, elev:10   },
  { id:'MH02', name:'Mumbai Suburban',    state:'Maharashtra',      lat:19.1776, lon:72.9534, elev:10   },
  { id:'MH03', name:'Thane',              state:'Maharashtra',      lat:19.2183, lon:72.9781, elev:7    },
  { id:'MH04', name:'Raigad',             state:'Maharashtra',      lat:18.5157, lon:73.1832, elev:50   },
  { id:'MH05', name:'Ratnagiri',          state:'Maharashtra',      lat:16.9902, lon:73.3120, elev:15   },
  { id:'MH06', name:'Sindhudurg',         state:'Maharashtra',      lat:16.3500, lon:73.5500, elev:7    },
  { id:'MH07', name:'Pune',               state:'Maharashtra',      lat:18.5204, lon:73.8567, elev:560  },
  { id:'MH08', name:'Satara',             state:'Maharashtra',      lat:17.6805, lon:74.0183, elev:666  },
  { id:'MH09', name:'Sangli',             state:'Maharashtra',      lat:16.8523, lon:74.5733, elev:549  },
  { id:'MH10', name:'Kolhapur',           state:'Maharashtra',      lat:16.7050, lon:74.2433, elev:569  },
  { id:'MH11', name:'Solapur',            state:'Maharashtra',      lat:17.6599, lon:75.9064, elev:479  },
  { id:'MH12', name:'Nashik',             state:'Maharashtra',      lat:19.9975, lon:73.7898, elev:566  },
  { id:'MH13', name:'Dhule',              state:'Maharashtra',      lat:20.9015, lon:74.7749, elev:320  },
  { id:'MH14', name:'Nandurbar',          state:'Maharashtra',      lat:21.3662, lon:74.2441, elev:195  },
  { id:'MH15', name:'Jalgaon',            state:'Maharashtra',      lat:21.0077, lon:75.5626, elev:209  },
  { id:'MH16', name:'Ahmednagar',         state:'Maharashtra',      lat:19.0952, lon:74.7495, elev:659  },
  { id:'MH17', name:'Aurangabad',         state:'Maharashtra',      lat:19.8762, lon:75.3433, elev:513  },
  { id:'MH18', name:'Jalna',              state:'Maharashtra',      lat:19.8300, lon:75.8800, elev:477  },
  { id:'MH19', name:'Beed',               state:'Maharashtra',      lat:18.9890, lon:75.7610, elev:636  },
  { id:'MH20', name:'Osmanabad',          state:'Maharashtra',      lat:18.1810, lon:76.0400, elev:602  },
  { id:'MH21', name:'Latur',              state:'Maharashtra',      lat:18.4088, lon:76.5604, elev:540  },
  { id:'MH22', name:'Nanded',             state:'Maharashtra',      lat:19.1383, lon:77.3210, elev:367  },
  { id:'MH23', name:'Parbhani',           state:'Maharashtra',      lat:19.2700, lon:76.7760, elev:356  },
  { id:'MH24', name:'Hingoli',            state:'Maharashtra',      lat:19.7160, lon:77.1480, elev:403  },
  { id:'MH25', name:'Buldhana',           state:'Maharashtra',      lat:20.5290, lon:76.1820, elev:470  },
  { id:'MH26', name:'Akola',              state:'Maharashtra',      lat:20.7096, lon:77.0024, elev:282  },
  { id:'MH27', name:'Washim',             state:'Maharashtra',      lat:20.1070, lon:77.1350, elev:459  },
  { id:'MH28', name:'Amravati',           state:'Maharashtra',      lat:20.9320, lon:77.7523, elev:340  },
  { id:'MH29', name:'Yavatmal',           state:'Maharashtra',      lat:20.3888, lon:78.1204, elev:447  },
  { id:'MH30', name:'Wardha',             state:'Maharashtra',      lat:20.7453, lon:78.6022, elev:276  },
  { id:'MH31', name:'Nagpur',             state:'Maharashtra',      lat:21.1458, lon:79.0882, elev:310  },
  { id:'MH32', name:'Bhandara',           state:'Maharashtra',      lat:21.1666, lon:79.6470, elev:239  },
  { id:'MH33', name:'Gondia',             state:'Maharashtra',      lat:21.4625, lon:80.1939, elev:310  },
  { id:'MH34', name:'Chandrapur',         state:'Maharashtra',      lat:19.9615, lon:79.2961, elev:190  },
  { id:'MH35', name:'Gadchiroli',         state:'Maharashtra',      lat:20.1800, lon:80.0000, elev:176  },
  { id:'MH36', name:'Mahabaleshwar',      state:'Maharashtra',      lat:17.9237, lon:73.6586, elev:1353 },
  // ── Gujarat — all 33 districts ────────────────────────────────────────────
  { id:'GJ01', name:'Ahmedabad',          state:'Gujarat',          lat:23.0225, lon:72.5714, elev:53   },
  { id:'GJ02', name:'Surat',              state:'Gujarat',          lat:21.1702, lon:72.8311, elev:13   },
  { id:'GJ03', name:'Vadodara',           state:'Gujarat',          lat:22.3072, lon:73.1812, elev:37   },
  { id:'GJ04', name:'Rajkot',             state:'Gujarat',          lat:22.3039, lon:70.8022, elev:138  },
  { id:'GJ05', name:'Bhavnagar',          state:'Gujarat',          lat:21.7645, lon:72.1519, elev:21   },
  { id:'GJ06', name:'Jamnagar',           state:'Gujarat',          lat:22.4707, lon:70.0577, elev:27   },
  { id:'GJ07', name:'Gandhinagar',        state:'Gujarat',          lat:23.2156, lon:72.6369, elev:81   },
  { id:'GJ08', name:'Anand',              state:'Gujarat',          lat:22.5645, lon:72.9289, elev:44   },
  { id:'GJ09', name:'Kutch (Bhuj)',       state:'Gujarat',          lat:23.2420, lon:69.6669, elev:82   },
  { id:'GJ10', name:'Mehsana',            state:'Gujarat',          lat:23.5880, lon:72.3690, elev:100  },
  { id:'GJ11', name:'Patan',              state:'Gujarat',          lat:23.8490, lon:72.1230, elev:118  },
  { id:'GJ12', name:'Banaskantha',        state:'Gujarat',          lat:24.1700, lon:72.4200, elev:125  },
  { id:'GJ13', name:'Sabarkantha',        state:'Gujarat',          lat:23.5800, lon:73.0300, elev:180  },
  { id:'GJ14', name:'Aravalli',           state:'Gujarat',          lat:23.5700, lon:73.2600, elev:200  },
  { id:'GJ15', name:'Gandhinagar (dist)', state:'Gujarat',          lat:23.2156, lon:72.6369, elev:81   },
  { id:'GJ16', name:'Kheda',              state:'Gujarat',          lat:22.7500, lon:72.6800, elev:33   },
  { id:'GJ17', name:'Mahisagar',          state:'Gujarat',          lat:23.0800, lon:73.5400, elev:87   },
  { id:'GJ18', name:'Panchmahal',         state:'Gujarat',          lat:22.7570, lon:73.5180, elev:115  },
  { id:'GJ19', name:'Dahod',              state:'Gujarat',          lat:22.8340, lon:74.2590, elev:280  },
  { id:'GJ20', name:'Vadodara (dist)',    state:'Gujarat',          lat:22.3072, lon:73.1812, elev:37   },
  { id:'GJ21', name:'Chhota Udaipur',     state:'Gujarat',          lat:22.3010, lon:74.0110, elev:165  },
  { id:'GJ22', name:'Narmada',            state:'Gujarat',          lat:21.8760, lon:73.4960, elev:90   },
  { id:'GJ23', name:'Bharuch',            state:'Gujarat',          lat:21.7051, lon:72.9959, elev:12   },
  { id:'GJ24', name:'Surat (dist)',       state:'Gujarat',          lat:21.1702, lon:72.8311, elev:13   },
  { id:'GJ25', name:'Navsari',            state:'Gujarat',          lat:20.9467, lon:72.9520, elev:8    },
  { id:'GJ26', name:'Valsad',             state:'Gujarat',          lat:20.5992, lon:72.9342, elev:6    },
  { id:'GJ27', name:'Dang',               state:'Gujarat',          lat:20.7500, lon:73.7000, elev:400  },
  { id:'GJ28', name:'Tapi',               state:'Gujarat',          lat:21.1200, lon:73.5100, elev:60   },
  { id:'GJ29', name:'Porbandar',          state:'Gujarat',          lat:21.6425, lon:69.6093, elev:5    },
  { id:'GJ30', name:'Junagadh',           state:'Gujarat',          lat:21.5222, lon:70.4579, elev:107  },
  { id:'GJ31', name:'Amreli',             state:'Gujarat',          lat:21.6035, lon:71.2225, elev:127  },
  { id:'GJ32', name:'Botad',              state:'Gujarat',          lat:22.1700, lon:71.6640, elev:84   },
  { id:'GJ33', name:'Gir Somnath',        state:'Gujarat',          lat:20.9000, lon:70.3600, elev:18   },
  // ── Karnataka — all 31 districts ─────────────────────────────────────────
  { id:'KA01', name:'Bengaluru Urban',    state:'Karnataka',        lat:12.9716, lon:77.5946, elev:920  },
  { id:'KA02', name:'Mysuru',             state:'Karnataka',        lat:12.2958, lon:76.6394, elev:770  },
  { id:'KA03', name:'Mangaluru',          state:'Karnataka',        lat:12.9141, lon:74.8560, elev:22   },
  { id:'KA04', name:'Hubballi-Dharwad',   state:'Karnataka',        lat:15.3647, lon:75.1240, elev:670  },
  { id:'KA05', name:'Belagavi',           state:'Karnataka',        lat:15.8497, lon:74.4977, elev:751  },
  { id:'KA06', name:'Shivamogga',         state:'Karnataka',        lat:13.9299, lon:75.5681, elev:575  },
  { id:'KA07', name:'Chikmagalur',        state:'Karnataka',        lat:13.3161, lon:75.7720, elev:1090 },
  { id:'KA08', name:'Coorg (Madikeri)',   state:'Karnataka',        lat:12.3375, lon:75.8069, elev:1083 },
  { id:'KA09', name:'Hassan',             state:'Karnataka',        lat:13.0068, lon:76.1004, elev:915  },
  { id:'KA10', name:'Dakshina Kannada',   state:'Karnataka',        lat:12.7540, lon:75.3880, elev:15   },
  { id:'KA11', name:'Udupi',              state:'Karnataka',        lat:13.3409, lon:74.7421, elev:12   },
  { id:'KA12', name:'Uttara Kannada',     state:'Karnataka',        lat:14.7860, lon:74.6130, elev:40   },
  { id:'KA13', name:'Gadag',              state:'Karnataka',        lat:15.4300, lon:75.6200, elev:655  },
  { id:'KA14', name:'Dharwad',            state:'Karnataka',        lat:15.4589, lon:75.0078, elev:748  },
  { id:'KA15', name:'Haveri',             state:'Karnataka',        lat:14.7900, lon:75.4000, elev:590  },
  { id:'KA16', name:'Bidar',              state:'Karnataka',        lat:17.9104, lon:77.5199, elev:664  },
  { id:'KA17', name:'Kalaburagi',         state:'Karnataka',        lat:17.3297, lon:76.8200, elev:454  },
  { id:'KA18', name:'Vijayapura',         state:'Karnataka',        lat:16.8302, lon:75.7100, elev:594  },
  { id:'KA19', name:'Bagalkot',           state:'Karnataka',        lat:16.1800, lon:75.6600, elev:547  },
  { id:'KA20', name:'Koppal',             state:'Karnataka',        lat:15.3550, lon:76.1540, elev:476  },
  { id:'KA21', name:'Ballari',            state:'Karnataka',        lat:15.1394, lon:76.9214, elev:468  },
  { id:'KA22', name:'Raichur',            state:'Karnataka',        lat:16.2120, lon:77.3560, elev:407  },
  { id:'KA23', name:'Yadgir',             state:'Karnataka',        lat:16.7630, lon:77.1380, elev:392  },
  { id:'KA24', name:'Mandya',             state:'Karnataka',        lat:12.5218, lon:76.8950, elev:724  },
  { id:'KA25', name:'Chamarajanagar',     state:'Karnataka',        lat:11.9240, lon:76.9440, elev:806  },
  { id:'KA26', name:'Tumkur',             state:'Karnataka',        lat:13.3400, lon:77.1010, elev:831  },
  { id:'KA27', name:'Chikballapur',       state:'Karnataka',        lat:13.4350, lon:77.7280, elev:910  },
  { id:'KA28', name:'Kolar',              state:'Karnataka',        lat:13.1350, lon:78.1290, elev:915  },
  { id:'KA29', name:'Bengaluru Rural',    state:'Karnataka',        lat:13.2260, lon:77.5710, elev:880  },
  { id:'KA30', name:'Ramanagara',         state:'Karnataka',        lat:12.7160, lon:77.2810, elev:804  },
  { id:'KA31', name:'Agumbe',             state:'Karnataka',        lat:13.5000, lon:75.0833, elev:820  },
  // ── Kerala — all 14 districts ─────────────────────────────────────────────
  { id:'KL01', name:'Thiruvananthapuram', state:'Kerala',           lat:8.5241,  lon:76.9366, elev:64   },
  { id:'KL02', name:'Kollam',             state:'Kerala',           lat:8.8932,  lon:76.6141, elev:6    },
  { id:'KL03', name:'Pathanamthitta',     state:'Kerala',           lat:9.2648,  lon:76.7870, elev:36   },
  { id:'KL04', name:'Alappuzha',          state:'Kerala',           lat:9.4981,  lon:76.3388, elev:2    },
  { id:'KL05', name:'Kottayam',           state:'Kerala',           lat:9.5916,  lon:76.5222, elev:3    },
  { id:'KL06', name:'Idukki',             state:'Kerala',           lat:9.8500,  lon:77.0000, elev:750  },
  { id:'KL07', name:'Ernakulam (Kochi)',  state:'Kerala',           lat:9.9312,  lon:76.2673, elev:3    },
  { id:'KL08', name:'Thrissur',           state:'Kerala',           lat:10.5276, lon:76.2144, elev:2    },
  { id:'KL09', name:'Palakkad',           state:'Kerala',           lat:10.7867, lon:76.6548, elev:80   },
  { id:'KL10', name:'Malappuram',         state:'Kerala',           lat:11.0510, lon:76.0710, elev:55   },
  { id:'KL11', name:'Kozhikode',          state:'Kerala',           lat:11.2588, lon:75.7804, elev:5    },
  { id:'KL12', name:'Wayanad',            state:'Kerala',           lat:11.6854, lon:76.1320, elev:900  },
  { id:'KL13', name:'Kannur',             state:'Kerala',           lat:11.8745, lon:75.3704, elev:6    },
  { id:'KL14', name:'Kasaragod',          state:'Kerala',           lat:12.4996, lon:74.9869, elev:14   },
  { id:'KL15', name:'Munnar',             state:'Kerala',           lat:10.0889, lon:77.0595, elev:1600 },
  // ── Tamil Nadu — all 38 districts ────────────────────────────────────────
  { id:'TN01', name:'Chennai',            state:'Tamil Nadu',       lat:13.0827, lon:80.2707, elev:6    },
  { id:'TN02', name:'Coimbatore',         state:'Tamil Nadu',       lat:11.0168, lon:76.9558, elev:411  },
  { id:'TN03', name:'Madurai',            state:'Tamil Nadu',       lat:9.9252,  lon:78.1198, elev:101  },
  { id:'TN04', name:'Tiruchirappalli',    state:'Tamil Nadu',       lat:10.7905, lon:78.7047, elev:88   },
  { id:'TN05', name:'Salem',              state:'Tamil Nadu',       lat:11.6643, lon:78.1460, elev:278  },
  { id:'TN06', name:'Tirunelveli',        state:'Tamil Nadu',       lat:8.7139,  lon:77.7567, elev:47   },
  { id:'TN07', name:'Tiruppur',           state:'Tamil Nadu',       lat:11.1085, lon:77.3411, elev:300  },
  { id:'TN08', name:'Vellore',            state:'Tamil Nadu',       lat:12.9165, lon:79.1325, elev:215  },
  { id:'TN09', name:'Erode',              state:'Tamil Nadu',       lat:11.3410, lon:77.7172, elev:183  },
  { id:'TN10', name:'Thoothukkudi',       state:'Tamil Nadu',       lat:8.7639,  lon:78.1348, elev:15   },
  { id:'TN11', name:'Dindigul',           state:'Tamil Nadu',       lat:10.3624, lon:77.9695, elev:294  },
  { id:'TN12', name:'Thanjavur',          state:'Tamil Nadu',       lat:10.7870, lon:79.1378, elev:58   },
  { id:'TN13', name:'Ranipet',            state:'Tamil Nadu',       lat:12.9220, lon:79.3320, elev:206  },
  { id:'TN14', name:'Tirupathur',         state:'Tamil Nadu',       lat:12.4960, lon:78.5710, elev:545  },
  { id:'TN15', name:'Krishnagiri',        state:'Tamil Nadu',       lat:12.5188, lon:78.2138, elev:522  },
  { id:'TN16', name:'Dharmapuri',         state:'Tamil Nadu',       lat:12.1211, lon:78.1582, elev:410  },
  { id:'TN17', name:'Namakkal',           state:'Tamil Nadu',       lat:11.2195, lon:78.1673, elev:227  },
  { id:'TN18', name:'Perambalur',         state:'Tamil Nadu',       lat:11.2330, lon:78.8820, elev:101  },
  { id:'TN19', name:'Ariyalur',           state:'Tamil Nadu',       lat:11.1390, lon:79.0780, elev:71   },
  { id:'TN20', name:'Cuddalore',          state:'Tamil Nadu',       lat:11.7480, lon:79.7680, elev:5    },
  { id:'TN21', name:'Villupuram',         state:'Tamil Nadu',       lat:11.9390, lon:79.4930, elev:49   },
  { id:'TN22', name:'Kallakurichi',       state:'Tamil Nadu',       lat:11.7370, lon:78.9570, elev:119  },
  { id:'TN23', name:'Tiruvannamalai',     state:'Tamil Nadu',       lat:12.2253, lon:79.0747, elev:196  },
  { id:'TN24', name:'Kancheepuram',       state:'Tamil Nadu',       lat:12.8352, lon:79.7325, elev:83   },
  { id:'TN25', name:'Chengalpattu',       state:'Tamil Nadu',       lat:12.6921, lon:79.9762, elev:45   },
  { id:'TN26', name:'Ooty (Nilgiris)',    state:'Tamil Nadu',       lat:11.4102, lon:76.6950, elev:2240 },
  { id:'TN27', name:'Kodaikanal',         state:'Tamil Nadu',       lat:10.2381, lon:77.4892, elev:2133 },
  { id:'TN28', name:'Yercaud',            state:'Tamil Nadu',       lat:11.7745, lon:78.2107, elev:1515 },
  { id:'TN29', name:'Ramanathapuram',     state:'Tamil Nadu',       lat:9.3762,  lon:78.8304, elev:24   },
  { id:'TN30', name:'Virudhunagar',       state:'Tamil Nadu',       lat:9.5851,  lon:77.9624, elev:122  },
  { id:'TN31', name:'Sivaganga',          state:'Tamil Nadu',       lat:9.8402,  lon:78.4827, elev:94   },
  { id:'TN32', name:'Pudukottai',         state:'Tamil Nadu',       lat:10.3797, lon:78.8200, elev:69   },
  { id:'TN33', name:'Karur',              state:'Tamil Nadu',       lat:10.9601, lon:78.0766, elev:170  },
  { id:'TN34', name:'Tiruvarur',          state:'Tamil Nadu',       lat:10.7741, lon:79.6368, elev:4    },
  { id:'TN35', name:'Nagapattinam',       state:'Tamil Nadu',       lat:10.7660, lon:79.8440, elev:4    },
  { id:'TN36', name:'Mayiladuthurai',     state:'Tamil Nadu',       lat:11.1030, lon:79.6520, elev:10   },
  { id:'TN37', name:'Kanyakumari',        state:'Tamil Nadu',       lat:8.0883,  lon:77.5385, elev:5    },
  { id:'TN38', name:'Tenkasi',            state:'Tamil Nadu',       lat:8.9590,  lon:77.3150, elev:125  },

  // ── Punjab — smaller cities and towns ────────────────────────────────────
  { id:'X001', name:'Kharar',             state:'Punjab',           lat:30.7468, lon:76.6452, elev:308  },
  { id:'X002', name:'Zirakpur',           state:'Punjab',           lat:30.6420, lon:76.8170, elev:317  },
  { id:'X003', name:'Dera Bassi',         state:'Punjab',           lat:30.5830, lon:76.8370, elev:305  },
  { id:'X004', name:'Morinda',            state:'Punjab',           lat:30.7920, lon:76.4980, elev:278  },
  { id:'X005', name:'Anandpur Sahib',     state:'Punjab',           lat:31.2380, lon:76.5010, elev:344  },
  { id:'X006', name:'Nangal',             state:'Punjab',           lat:31.3860, lon:76.3700, elev:388  },
  { id:'X007', name:'Nawanshahr',         state:'Punjab',           lat:31.1255, lon:76.1162, elev:320  },
  { id:'X008', name:'Phagwara',           state:'Punjab',           lat:31.2230, lon:75.7710, elev:239  },
  { id:'X009', name:'Nakodar',            state:'Punjab',           lat:31.1270, lon:75.4760, elev:234  },
  { id:'X010', name:'Abohar',             state:'Punjab',           lat:30.1440, lon:74.1950, elev:178  },
  { id:'X011', name:'Malout',             state:'Punjab',           lat:30.2090, lon:74.4840, elev:184  },
  { id:'X012', name:'Rajpura',            state:'Punjab',           lat:30.4820, lon:76.5970, elev:275  },
  { id:'X013', name:'Banur',              state:'Punjab',           lat:30.5580, lon:76.7110, elev:292  },
  { id:'X014', name:'Kurali',             state:'Punjab',           lat:30.8300, lon:76.5790, elev:302  },
  { id:'X015', name:'Sirhind',            state:'Punjab',           lat:30.6280, lon:76.3930, elev:245  },
  { id:'X016', name:'Khanna',             state:'Punjab',           lat:30.7060, lon:76.2180, elev:258  },
  { id:'X017', name:'Doraha',             state:'Punjab',           lat:30.7980, lon:76.0310, elev:250  },
  { id:'X018', name:'Machhiwara',         state:'Punjab',           lat:30.9230, lon:76.1980, elev:255  },
  { id:'X019', name:'Samrala',            state:'Punjab',           lat:30.8390, lon:76.1930, elev:255  },
  { id:'X020', name:'Gobindgarh',         state:'Punjab',           lat:30.6700, lon:76.3200, elev:248  },
  { id:'X021', name:'Chamkaur Sahib',     state:'Punjab',           lat:30.8920, lon:76.4120, elev:280  },
  { id:'X022', name:'Balachaur',          state:'Punjab',           lat:31.2730, lon:76.3320, elev:398  },
  { id:'X023', name:'Garhshankar',        state:'Punjab',           lat:31.2190, lon:76.1430, elev:340  },
  { id:'X024', name:'Mukerian',           state:'Punjab',           lat:31.9500, lon:75.6120, elev:268  },
  { id:'X025', name:'Dasuya',             state:'Punjab',           lat:31.8110, lon:75.6540, elev:268  },
  { id:'X026', name:'Batala',             state:'Punjab',           lat:31.8160, lon:75.2010, elev:258  },
  { id:'X027', name:'Dera Baba Nanak',    state:'Punjab',           lat:32.0340, lon:75.0340, elev:248  },
  { id:'X028', name:'Qadian',             state:'Punjab',           lat:31.8220, lon:75.3790, elev:252  },
  { id:'X029', name:'Dinanagar',          state:'Punjab',           lat:32.1380, lon:75.4690, elev:280  },
  { id:'X030', name:'Mamun',              state:'Punjab',           lat:32.2580, lon:75.6840, elev:305  },
  { id:'X031', name:'Sunam',              state:'Punjab',           lat:30.1290, lon:75.7890, elev:228  },
  { id:'X032', name:'Dhuri',              state:'Punjab',           lat:30.3660, lon:75.8660, elev:235  },
  { id:'X033', name:'Rampura Phul',       state:'Punjab',           lat:30.2680, lon:75.1430, elev:218  },
  { id:'X034', name:'Sultanpur Lodhi',    state:'Punjab',           lat:31.2140, lon:75.1940, elev:221  },
  { id:'X035', name:'Fatehgarh Sahib (t)',state:'Punjab',           lat:30.6490, lon:76.3880, elev:247  },
  // ── Haryana — smaller cities and towns ───────────────────────────────────
  { id:'X050', name:'Pinjore',            state:'Haryana',          lat:30.7980, lon:76.9060, elev:460  },
  { id:'X051', name:'Kalka',              state:'Haryana',          lat:30.8440, lon:76.9480, elev:656  },
  { id:'X052', name:'Barwala',            state:'Haryana',          lat:30.3490, lon:76.9380, elev:280  },
  { id:'X053', name:'Naraingarh',         state:'Haryana',          lat:30.4570, lon:77.2950, elev:372  },
  { id:'X054', name:'Mullana',            state:'Haryana',          lat:30.2690, lon:77.0470, elev:300  },
  { id:'X055', name:'Thanesar',           state:'Haryana',          lat:29.9695, lon:76.8783, elev:253  },
  { id:'X056', name:'Pehowa',             state:'Haryana',          lat:29.9830, lon:76.5850, elev:258  },
  { id:'X057', name:'Gharaunda',          state:'Haryana',          lat:29.5350, lon:76.9710, elev:235  },
  { id:'X058', name:'Taraori',            state:'Haryana',          lat:29.7310, lon:76.8580, elev:245  },
  { id:'X059', name:'Samalkha',           state:'Haryana',          lat:29.2360, lon:77.0280, elev:222  },
  { id:'X060', name:'Ganaur',             state:'Haryana',          lat:29.1180, lon:77.0100, elev:222  },
  { id:'X061', name:'Kundli',             state:'Haryana',          lat:28.8620, lon:77.0640, elev:215  },
  { id:'X062', name:'Bahadurgarh',        state:'Haryana',          lat:28.6960, lon:76.9280, elev:216  },
  { id:'X063', name:'Ballabhgarh',        state:'Haryana',          lat:28.3410, lon:77.3230, elev:198  },
  { id:'X064', name:'Sohna',              state:'Haryana',          lat:28.2440, lon:77.0730, elev:229  },
  { id:'X065', name:'Manesar',            state:'Haryana',          lat:28.3580, lon:76.9360, elev:220  },
  { id:'X066', name:'Narnaul',            state:'Haryana',          lat:28.0530, lon:76.1130, elev:308  },
  { id:'X067', name:'Hansi',              state:'Haryana',          lat:29.1030, lon:75.9670, elev:215  },
  { id:'X068', name:'Tohana',             state:'Haryana',          lat:29.7000, lon:75.9120, elev:220  },
  { id:'X069', name:'Narwana',            state:'Haryana',          lat:29.6070, lon:76.1090, elev:222  },
  { id:'X070', name:'Safidon',            state:'Haryana',          lat:29.3990, lon:76.6560, elev:224  },
  { id:'X071', name:'Jind (town)',        state:'Haryana',          lat:29.3160, lon:76.3150, elev:218  },
  { id:'X072', name:'Kaithal (town)',     state:'Haryana',          lat:29.8010, lon:76.3990, elev:232  },
  { id:'X073', name:'Ladwa',              state:'Haryana',          lat:29.9990, lon:77.0530, elev:257  },
  { id:'X074', name:'Nilokheri',          state:'Haryana',          lat:29.8390, lon:76.9330, elev:248  },
  { id:'X075', name:'Indri',              state:'Haryana',          lat:29.8750, lon:77.1820, elev:258  },
  { id:'X076', name:'Hodal',              state:'Haryana',          lat:27.8980, lon:77.3680, elev:192  },
  { id:'X077', name:'Palwal (town)',      state:'Haryana',          lat:28.1440, lon:77.3290, elev:205  },
  { id:'X078', name:'Rewari (town)',      state:'Haryana',          lat:28.1980, lon:76.6170, elev:245  },
  // ── Himachal Pradesh — smaller towns ─────────────────────────────────────
  { id:'X100', name:'Parwanoo',           state:'Himachal Pradesh', lat:30.8349, lon:76.9614, elev:658  },
  { id:'X101', name:'Baddi',              state:'Himachal Pradesh', lat:30.9572, lon:76.7927, elev:460  },
  { id:'X102', name:'Nalagarh',           state:'Himachal Pradesh', lat:31.0430, lon:76.7190, elev:521  },
  { id:'X103', name:'Sunni',              state:'Himachal Pradesh', lat:31.2400, lon:77.3600, elev:650  },
  { id:'X104', name:'Theog',              state:'Himachal Pradesh', lat:31.1170, lon:77.3550, elev:2200 },
  { id:'X105', name:'Chail',              state:'Himachal Pradesh', lat:30.9640, lon:77.1990, elev:2250 },
  { id:'X106', name:'Mashobra',           state:'Himachal Pradesh', lat:31.1500, lon:77.2500, elev:2149 },
  { id:'X107', name:'Fagu',               state:'Himachal Pradesh', lat:31.0890, lon:77.2990, elev:2450 },
  { id:'X108', name:'Jubbal',             state:'Himachal Pradesh', lat:31.1060, lon:77.6560, elev:2150 },
  { id:'X109', name:'Rohru',              state:'Himachal Pradesh', lat:31.2070, lon:77.7510, elev:1525 },
  { id:'X110', name:'Paonta Sahib',       state:'Himachal Pradesh', lat:30.4380, lon:77.6250, elev:387  },
  { id:'X111', name:'Mcleod Ganj',        state:'Himachal Pradesh', lat:32.2431, lon:76.3188, elev:1457 },
  { id:'X112', name:'Khajjiar',           state:'Himachal Pradesh', lat:32.5380, lon:76.0990, elev:2000 },
  { id:'X113', name:'Sundernagar',        state:'Himachal Pradesh', lat:31.5340, lon:76.8880, elev:900  },
  { id:'X114', name:'Jogindernagar',      state:'Himachal Pradesh', lat:31.9940, lon:76.7940, elev:1190 },
  { id:'X115', name:'Baijnath',           state:'Himachal Pradesh', lat:32.0530, lon:76.6490, elev:1126 },
  { id:'X116', name:'Bir Billing',        state:'Himachal Pradesh', lat:32.0420, lon:76.7260, elev:1525 },
  { id:'X117', name:'Nurpur',             state:'Himachal Pradesh', lat:32.2970, lon:75.9000, elev:690  },
  { id:'X118', name:'Dehra Gopipur',      state:'Himachal Pradesh', lat:31.8860, lon:76.5380, elev:580  },
  { id:'X119', name:'Jawalamukhit',       state:'Himachal Pradesh', lat:31.8680, lon:76.3160, elev:640  },
  { id:'X120', name:'Sujanpur',           state:'Himachal Pradesh', lat:31.8310, lon:76.5000, elev:720  },
  { id:'X121', name:'Nadaun',             state:'Himachal Pradesh', lat:31.7760, lon:76.3440, elev:540  },
  { id:'X122', name:'Kandaghat',          state:'Himachal Pradesh', lat:30.9830, lon:77.1080, elev:1380 },
  { id:'X123', name:'Arki',               state:'Himachal Pradesh', lat:31.1520, lon:76.9680, elev:1200 },
  { id:'X124', name:'Renuka Ji',          state:'Himachal Pradesh', lat:30.6090, lon:77.4540, elev:750  },
  // ── Uttarakhand — smaller towns ───────────────────────────────────────────
  { id:'X150', name:'Rishikesh (town)',   state:'Uttarakhand',      lat:30.0869, lon:78.2676, elev:372  },
  { id:'X151', name:'Doiwala',            state:'Uttarakhand',      lat:30.1870, lon:78.1250, elev:370  },
  { id:'X152', name:'Vikasnagar',         state:'Uttarakhand',      lat:30.4770, lon:77.7750, elev:602  },
  { id:'X153', name:'Joshimath',          state:'Uttarakhand',      lat:30.5590, lon:79.5640, elev:1875 },
  { id:'X154', name:'Auli',               state:'Uttarakhand',      lat:30.5270, lon:79.5660, elev:2519 },
  { id:'X155', name:'Chopta',             state:'Uttarakhand',      lat:30.4890, lon:79.2110, elev:2680 },
  { id:'X156', name:'Guptkashi',          state:'Uttarakhand',      lat:30.5240, lon:79.0740, elev:1319 },
  { id:'X157', name:'Devprayag',          state:'Uttarakhand',      lat:30.1450, lon:78.5970, elev:618  },
  { id:'X158', name:'Srinagar Garhwal',   state:'Uttarakhand',      lat:30.2222, lon:78.7833, elev:560  },
  { id:'X159', name:'Karnprayag',         state:'Uttarakhand',      lat:30.2680, lon:79.2270, elev:787  },
  { id:'X160', name:'Gopeshwar',          state:'Uttarakhand',      lat:30.3820, lon:79.3240, elev:1289 },
  { id:'X161', name:'Kotdwar',            state:'Uttarakhand',      lat:29.7500, lon:78.5240, elev:395  },
  { id:'X162', name:'Munsiyari',          state:'Uttarakhand',      lat:30.0653, lon:80.2351, elev:2298 },
  { id:'X163', name:'Dharchula',          state:'Uttarakhand',      lat:29.8510, lon:80.5350, elev:915  },
  { id:'X164', name:'Tanakpur',           state:'Uttarakhand',      lat:29.0740, lon:80.1120, elev:215  },
  { id:'X165', name:'Lohaghat',           state:'Uttarakhand',      lat:29.4110, lon:80.0700, elev:1814 },
  { id:'X166', name:'Champawat (town)',   state:'Uttarakhand',      lat:29.3330, lon:80.0910, elev:1616 },
  { id:'X167', name:'Roorkee (town)',     state:'Uttarakhand',      lat:29.8543, lon:77.8880, elev:268  },
  { id:'X168', name:'Laksar',             state:'Uttarakhand',      lat:29.7540, lon:78.0280, elev:258  },
  { id:'X169', name:'Uttarkashi (town)',  state:'Uttarakhand',      lat:30.7268, lon:78.4354, elev:1158 },
  { id:'X170', name:'Barkot',             state:'Uttarakhand',      lat:30.8010, lon:78.2240, elev:1436 },
  { id:'X171', name:'Purola',             state:'Uttarakhand',      lat:30.8660, lon:77.9220, elev:1524 },
  { id:'X172', name:'Bageshwar (town)',   state:'Uttarakhand',      lat:29.8380, lon:79.7690, elev:960  },
  { id:'X173', name:'Kapkot',             state:'Uttarakhand',      lat:29.9040, lon:80.0000, elev:1160 },
  { id:'X174', name:'Gangolihaat',        state:'Uttarakhand',      lat:29.8240, lon:80.0050, elev:1740 },
  { id:'X175', name:'Didihat',            state:'Uttarakhand',      lat:29.7930, lon:80.3970, elev:1739 },
  { id:'X176', name:'Haldwani (town)',    state:'Uttarakhand',      lat:29.2183, lon:79.5130, elev:424  },
  { id:'X177', name:'Ramnagar (town)',    state:'Uttarakhand',      lat:29.3947, lon:79.1294, elev:345  },
  { id:'X178', name:'Kashipur',           state:'Uttarakhand',      lat:29.2152, lon:78.9641, elev:221  },
  { id:'X179', name:'Jaspur',             state:'Uttarakhand',      lat:29.2830, lon:78.8250, elev:212  },
  { id:'X180', name:'Kichha',             state:'Uttarakhand',      lat:28.9140, lon:79.5020, elev:230  },
  { id:'X181', name:'Rudrapur',           state:'Uttarakhand',      lat:28.9707, lon:79.3980, elev:243  },
  { id:'X182', name:'Sitarganj',          state:'Uttarakhand',      lat:28.9310, lon:79.7060, elev:235  },
  { id:'X183', name:'Khatima',            state:'Uttarakhand',      lat:28.9200, lon:79.9720, elev:236  },
]

// ── RNG (fallback only) ───────────────────────────────────────────────────────
function makeRng(seed) {
  let s = (seed >>> 0) || 1
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff }
}

// ── OpenWeatherMap API ────────────────────────────────────────────────────────
async function fetchCurrentWeather(lat, lon) {
  const url = `${OWM_BASE}/weather?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric`
  const res = await fetch(url)
  if (!res.ok) throw new Error('OWM current weather failed')
  const d = await res.json()
  return {
    temperature_c:           +d.main.temp.toFixed(1),
    humidity_pct:            d.main.humidity,
    pressure_hpa:            d.main.pressure,
    wind_speed_kmh:          +(d.wind.speed * 3.6).toFixed(1),
    wind_direction_deg:      d.wind.deg || 0,
    rainfall_mm_1h:          +(d.rain?.['1h'] || 0).toFixed(1),
    rainfall_mm_3h:          +(d.rain?.['3h'] || 0).toFixed(1),
    cloud_cover_pct:         d.clouds.all,
    visibility_km:           +((d.visibility || 10000) / 1000).toFixed(1),
    weather_desc:            d.weather[0].description,
    weather_icon:            d.weather[0].icon,
    weather_main:            d.weather[0].main,
    feels_like:              +d.main.feels_like.toFixed(1),
    temp_min:                +d.main.temp_min.toFixed(1),
    temp_max:                +d.main.temp_max.toFixed(1),
    dewpoint_c:              +(d.main.temp - ((100 - d.main.humidity) / 5)).toFixed(1),
  }
}

async function fetch5DayForecast(lat, lon) {
  const url = `${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric`
  const res = await fetch(url)
  if (!res.ok) throw new Error('OWM forecast failed')
  const d = await res.json()
  // Group by day
  const days = {}
  d.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0]
    if (!days[date]) days[date] = []
    days[date].push(item)
  })
  return Object.entries(days).slice(0, 7).map(([date, items], i) => {
    const rains    = items.map(x => x.rain?.['3h'] || 0)
    const totalRain= rains.reduce((a, b) => a + b, 0)
    const maxRain  = Math.max(...rains)
    const temps    = items.map(x => x.main.temp)
    const hums     = items.map(x => x.main.humidity)
    const winds    = items.map(x => x.wind.speed * 3.6)
    const preses   = items.map(x => x.main.pressure)
    const rainChance = Math.round(Math.max(...items.map(x => (x.pop || 0) * 100)))
    const humidity = Math.round(hums.reduce((a,b)=>a+b,0)/hums.length)
    const pressure = +(preses.reduce((a,b)=>a+b,0)/preses.length).toFixed(1)
    const wind     = +(winds.reduce((a,b)=>a+b,0)/winds.length).toFixed(1)
    const icon     = items[4]?.weather[0]?.icon || items[0]?.weather[0]?.icon || '01d'
    const desc     = items[4]?.weather[0]?.main || items[0]?.weather[0]?.main || 'Clear'
    const iconMap  = { Clear:'☀️', Clouds:'🌥️', Rain:'🌧️', Drizzle:'🌦️', Thunderstorm:'⛈️', Snow:'❄️', Mist:'🌫️', Fog:'🌫️' }
    const cbRisk   = Math.min(0.95, Math.max(0.02,
      (maxRain / 100) * 0.38 + (Math.max(humidity - 70, 0) / 30) * 0.22 +
      (Math.max(1010 - pressure, 0) / 20) * 0.18 + (wind / 60) * 0.1 +
      (rainChance / 100) * 0.12 + (desc === 'Thunderstorm' ? 0.1 : 0)
    ))
    const riskLevel = cbRisk < 0.30 ? 'LOW' : cbRisk < 0.55 ? 'MODERATE' : cbRisk < 0.75 ? 'HIGH' : 'CRITICAL'
    const dateObj = new Date(date)
    return {
      label:      i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(dateObj, 'EEE, d MMM'),
      date,
      icon:       iconMap[desc] || '🌤️',
      owmIcon:    icon,
      type:       desc,
      tempHigh:   Math.round(Math.max(...temps)),
      tempLow:    Math.round(Math.min(...temps)),
      humidity,
      rainfall:   +totalRain.toFixed(1),
      rainChance,
      pressure,
      wind:       Math.round(wind),
      cbRisk:     +cbRisk.toFixed(3),
      riskLevel,
      hourly:     items.map(x => ({
        time:     x.dt_txt.split(' ')[1].slice(0,5),
        temp:     +x.main.temp.toFixed(1),
        rain:     +(x.rain?.['3h'] || 0).toFixed(1),
        humidity: x.main.humidity,
        wind:     +(x.wind.speed * 3.6).toFixed(1),
        desc:     x.weather[0].main,
      }))
    }
  })
}

async function fetchHistoricalData(lat, lon, hours = 24) {
  // OWM free tier doesn't have historical — use 5-day/3h data as recent history
  const url = `${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric`
  const res = await fetch(url)
  if (!res.ok) throw new Error('OWM history failed')
  const d = await res.json()
  return d.list.slice(0, 8).map(item => ({
    timestamp:               item.dt_txt,
    temperature_c:           +item.main.temp.toFixed(1),
    humidity_pct:            item.main.humidity,
    pressure_hpa:            item.main.pressure,
    wind_speed_kmh:          +(item.wind.speed * 3.6).toFixed(1),
    rainfall_mm_1h:          +(item.rain?.['3h'] || 0).toFixed(1),
    rainfall_mm_3h:          +(item.rain?.['3h'] || 0).toFixed(1),
    radar_reflectivity_dbz:  Math.min(75, (item.rain?.['3h'] || 0) * 1.2 + 10),
    cloudburst_probability:  Math.min(0.95, ((item.rain?.['3h'] || 0) / 100) * 0.6 + ((item.pop || 0) * 0.4)),
  }))
}

// ── Rain intensity helper ─────────────────────────────────────────────────────
function getRainIntensity(mmh) {
  if (mmh === 0)     return { label: 'None',     color: '#484f58', bg: 'rgba(72,79,88,0.2)' }
  if (mmh < 2.5)     return { label: 'Light',    color: '#4fc3f7', bg: 'rgba(79,195,247,0.15)' }
  if (mmh < 7.5)     return { label: 'Moderate', color: '#185FA5', bg: 'rgba(24,95,165,0.2)' }
  if (mmh < 35)      return { label: 'Heavy',    color: '#EF9F27', bg: 'rgba(239,159,39,0.2)' }
  if (mmh < 100)     return { label: 'Very Heavy',color: '#D85A30', bg: 'rgba(216,90,48,0.2)' }
  return               { label: 'EXTREME',   color: '#E24B4A', bg: 'rgba(226,75,74,0.2)' }
}

// ── Distance calculator ────────────────────────────────────────────────────────
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Constants ─────────────────────────────────────────────────────────────────
const RISK_COLOR = { LOW:'#639922', MODERATE:'#EF9F27', HIGH:'#D85A30', CRITICAL:'#E24B4A' }
const RISK_BG    = { LOW:'rgba(59,109,17,0.12)', MODERATE:'rgba(239,159,39,0.13)', HIGH:'rgba(216,90,48,0.14)', CRITICAL:'rgba(226,75,74,0.17)' }
const HINDI = {
  LOW: 'कम जोखिम', MODERATE: 'मध्यम जोखिम', HIGH: 'उच्च जोखिम', CRITICAL: 'गंभीर खतरा',
  search: 'शहर या जिला खोजें...', forecast: '7 दिन का पूर्वानुमान',
  rainfall: 'वर्षा', humidity: 'आर्द्रता', pressure: 'दबाव', wind: 'हवा',
  risk: 'बादल फटने का जोखिम', recommendations: 'सिफारिशें', loading: 'लोड हो रहा है...',
  realData: 'असली डेटा', simData: 'अनुमानित डेटा',
}

// ── Location Search ───────────────────────────────────────────────────────────
function LocationSearch({ onSelect, currentName, lang }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return }
    const q = query.toLowerCase()
    const hits = LOCATIONS.filter(l =>
      l.name.toLowerCase().includes(q) || l.state.toLowerCase().includes(q)
    ).slice(0, 9)
    setResults(hits); setOpen(true)
  }, [query])

  useEffect(() => {
    const fn = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div ref={wrapRef} style={{ position:'relative', width:'100%', maxWidth:'440px' }}>
      <div style={{ display:'flex', alignItems:'center', background:'#1c2230', border:'1px solid rgba(99,120,170,0.4)', borderRadius:'10px', padding:'0 12px', gap:'8px' }}>
        <span style={{ fontSize:'14px', opacity:0.5, flexShrink:0 }}>🔍</span>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder={lang === 'hi' ? HINDI.search : `Search city or state... (${currentName})`}
          style={{ background:'none', border:'none', outline:'none', color:'#e6edf3', fontSize:'13px', padding:'10px 0', width:'100%', fontFamily:"'DM Sans',sans-serif" }} />
        {query && <span onClick={() => { setQuery(''); setOpen(false) }}
          style={{ cursor:'pointer', color:'#8b949e', fontSize:'18px', lineHeight:1, flexShrink:0 }}>&times;</span>}
      </div>
      {open && results.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#1c2230', border:'1px solid rgba(99,120,170,0.35)', borderRadius:'10px', zIndex:300, overflow:'hidden', boxShadow:'0 12px 40px rgba(0,0,0,0.6)' }}>
          {results.map((loc, idx) => (
            <div key={loc.id} onClick={() => { onSelect(loc); setQuery(''); setOpen(false) }}
              style={{ padding:'10px 14px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: idx < results.length-1 ? '0.5px solid rgba(99,120,170,0.1)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background='#252d3d'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div>
                <span style={{ fontSize:'13px', color:'#e6edf3', fontWeight:500 }}>{loc.name}</span>
                <span style={{ fontSize:'11px', color:'#8b949e', marginLeft:'8px' }}>{loc.state}</span>
              </div>
              <div style={{ fontSize:'10px', color:'#8b949e', textAlign:'right', flexShrink:0, marginLeft:'12px' }}>
                <div>{loc.elev}m</div>
                <div>{loc.lat.toFixed(2)}N</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#1c2230', border:'1px solid rgba(99,120,170,0.3)', borderRadius:'10px', zIndex:300, padding:'14px', fontSize:'12px', color:'#8b949e' }}>
          No results for "{query}"
        </div>
      )}
    </div>
  )
}

// ── Forecast Card ─────────────────────────────────────────────────────────────
function ForecastCard({ day, selected, onClick, lang }) {
  const color = RISK_COLOR[day.riskLevel]
  return (
    <div onClick={onClick} style={{ background: selected ? `${color}18` : day.riskLevel !== 'LOW' ? RISK_BG[day.riskLevel] : '#1c2230',
      border:`1px solid ${selected ? color : day.riskLevel !== 'LOW' ? color+'55' : 'rgba(99,120,170,0.18)'}`,
      borderRadius:'12px', padding:'12px 10px', textAlign:'center', flex:'1 1 0', minWidth:'105px', cursor:'pointer', transition:'all .15s' }}>
      <div style={{ fontSize:'11px', color:'#8b949e', marginBottom:'5px', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{day.label}</div>
      <div style={{ fontSize:'24px', marginBottom:'4px', lineHeight:1 }}>{day.icon}</div>
      <div style={{ fontSize:'9px', color:'#8b949e', marginBottom:'7px', minHeight:'26px', lineHeight:1.4 }}>{day.type}</div>
      <div style={{ display:'flex', justifyContent:'center', gap:'4px', marginBottom:'6px' }}>
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:'12px', fontWeight:700, color:'#e6edf3' }}>{day.tempHigh}°</span>
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:'12px', color:'#484f58' }}>{day.tempLow}°</span>
      </div>
      <div style={{ fontSize:'10px', color:'#4fc3f7', marginBottom:'3px' }}>💧 {day.rainChance}%</div>
      {day.rainfall > 0.5 && <div style={{ fontSize:'10px', color:'#8b949e', marginBottom:'5px' }}>{day.rainfall}mm</div>}
      <div style={{ padding:'2px 5px', borderRadius:'8px', fontSize:'9px', fontWeight:600, background:`${color}20`, color, border:`1px solid ${color}44`, display:'inline-block', marginBottom:'3px' }}>
        {lang === 'hi' ? HINDI[day.riskLevel] : day.riskLevel}
      </div>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:'11px', fontWeight:700, color, marginTop:'2px' }}>{Math.round(day.cbRisk * 100)}%</div>
    </div>
  )
}

// ── Compare Modal ─────────────────────────────────────────────────────────────
function CompareModal({ onClose, primaryLoc, primaryWeather, lang }) {
  const [compareSearch, setCompareSearch] = useState('')
  const [compareLoc,    setCompareLoc]    = useState(null)
  const [compareWeather,setCompareWeather]= useState(null)
  const [loading,       setLoading]       = useState(false)

  const loadCompare = async (loc) => {
    setLoading(true)
    try {
      const w = await fetchCurrentWeather(loc.lat, loc.lon)
      const pred = simulatePrediction({ station_id: loc.id, ...w })
      setCompareWeather({ ...w, prediction: pred })
      setCompareLoc(loc)
    } catch { setCompareWeather(null) }
    setLoading(false)
  }

  const cols = [
    { key: 'temperature_c',  label: 'Temperature', unit: '°C' },
    { key: 'humidity_pct',   label: 'Humidity',    unit: '%'  },
    { key: 'pressure_hpa',   label: 'Pressure',    unit: ' hPa' },
    { key: 'wind_speed_kmh', label: 'Wind',        unit: ' km/h' },
    { key: 'rainfall_mm_1h', label: 'Rainfall 1h', unit: ' mm' },
  ]

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.75)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#1c2230', borderRadius:'16px', padding:'24px', maxWidth:'620px', width:'100%', border:'1px solid rgba(99,120,170,0.3)', maxHeight:'80vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <h2 style={{ color:'#e6edf3', fontSize:'16px', fontWeight:600, margin:0 }}>Compare Cities</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#8b949e', fontSize:'22px', cursor:'pointer' }}>&times;</button>
        </div>
        <div style={{ marginBottom:'16px' }}>
          <input value={compareSearch} onChange={e => {
            setCompareSearch(e.target.value)
            const q = e.target.value.toLowerCase()
            if (q.length >= 2) {
              const hit = LOCATIONS.find(l => l.name.toLowerCase().includes(q) || l.state.toLowerCase().includes(q))
              if (hit) loadCompare(hit)
            }
          }} placeholder="Type city to compare..." style={{ width:'100%', background:'#161b22', border:'1px solid rgba(99,120,170,0.3)', borderRadius:'8px', padding:'10px 12px', color:'#e6edf3', outline:'none', fontSize:'13px', fontFamily:"'DM Sans',sans-serif" }} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'16px' }}>
          <div style={{ fontSize:'11px', color:'#8b949e', fontWeight:600, padding:'8px 0', borderBottom:'1px solid rgba(99,120,170,0.2)' }}>Parameter</div>
          <div style={{ fontSize:'12px', color:'#4fc3f7', fontWeight:600, padding:'8px 0', borderBottom:'1px solid rgba(99,120,170,0.2)', textAlign:'center' }}>{primaryLoc.name}</div>
          <div style={{ fontSize:'12px', color:'#EF9F27', fontWeight:600, padding:'8px 0', borderBottom:'1px solid rgba(99,120,170,0.2)', textAlign:'center' }}>{compareLoc?.name || '—'}</div>
          {cols.map(col => {
            const v1 = primaryWeather?.[col.key]
            const v2 = compareWeather?.[col.key]
            return [
              <div key={col.key+'l'} style={{ fontSize:'11px', color:'#8b949e', padding:'7px 0', borderBottom:'0.5px solid rgba(99,120,170,0.08)' }}>{col.label}</div>,
              <div key={col.key+'1'} style={{ fontSize:'12px', color:'#e6edf3', padding:'7px 0', textAlign:'center', fontFamily:"'Space Mono',monospace", borderBottom:'0.5px solid rgba(99,120,170,0.08)' }}>{v1 != null ? v1 + col.unit : '—'}</div>,
              <div key={col.key+'2'} style={{ fontSize:'12px', color: loading ? '#8b949e' : '#e6edf3', padding:'7px 0', textAlign:'center', fontFamily:"'Space Mono',monospace", borderBottom:'0.5px solid rgba(99,120,170,0.08)' }}>{loading ? '...' : v2 != null ? v2 + col.unit : '—'}</div>,
            ]
          })}
          <div style={{ fontSize:'11px', color:'#8b949e', padding:'7px 0' }}>CB Risk</div>
          <div style={{ padding:'7px 0', textAlign:'center' }}>
            {primaryWeather?.prediction && <span style={{ fontSize:'11px', fontWeight:700, color: RISK_COLOR[primaryWeather.prediction.risk_level] }}>{Math.round((primaryWeather.prediction.probability||0)*100)}%</span>}
          </div>
          <div style={{ padding:'7px 0', textAlign:'center' }}>
            {compareWeather?.prediction && <span style={{ fontSize:'11px', fontWeight:700, color: RISK_COLOR[compareWeather.prediction.risk_level] }}>{Math.round((compareWeather.prediction.probability||0)*100)}%</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Custom Location Modal ──────────────────────────────────────────────────────
function CustomLocModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [lat,  setLat]  = useState('')
  const [lon,  setLon]  = useState('')
  const valid = name.length > 1 && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.75)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#1c2230', borderRadius:'16px', padding:'24px', maxWidth:'400px', width:'100%', border:'1px solid rgba(99,120,170,0.3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <h2 style={{ color:'#e6edf3', fontSize:'16px', fontWeight:600, margin:0 }}>Add Custom Location</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#8b949e', fontSize:'22px', cursor:'pointer' }}>&times;</button>
        </div>
        {[['Location Name', name, setName, 'text', 'e.g. My Village'],
          ['Latitude', lat, setLat, 'number', 'e.g. 30.7333'],
          ['Longitude', lon, setLon, 'number', 'e.g. 76.7794']].map(([label, val, setter, type, ph]) => (
          <div key={label} style={{ marginBottom:'14px' }}>
            <label style={{ fontSize:'11px', color:'#8b949e', display:'block', marginBottom:'5px' }}>{label}</label>
            <input type={type} value={val} onChange={e => setter(e.target.value)} placeholder={ph}
              style={{ width:'100%', background:'#161b22', border:'1px solid rgba(99,120,170,0.3)', borderRadius:'8px', padding:'10px 12px', color:'#e6edf3', outline:'none', fontSize:'13px', fontFamily:"'DM Sans',sans-serif" }} />
          </div>
        ))}
        <button onClick={() => { if(valid) { onAdd({ id:'CUSTOM_'+Date.now(), name, state:'Custom Location', lat:parseFloat(lat), lon:parseFloat(lon), elev:0 }); onClose() } }}
          style={{ width:'100%', padding:'11px', background: valid ? '#185FA5' : '#2a3040', color: valid ? '#fff' : '#8b949e', border:'none', borderRadius:'9px', fontSize:'13px', fontWeight:500, cursor: valid ? 'pointer':'default', fontFamily:"'DM Sans',sans-serif" }}>
          Add Location
        </button>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ onBack }) {
  const [activeLocation,  setActiveLocation]  = useState(LOCATIONS[0])
  const [currentWeather,  setCurrentWeather]  = useState(null)
  const [weatherHistory,  setWeatherHistory]  = useState([])
  const [forecast,        setForecast]        = useState([])
  const [prediction,      setPrediction]      = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [apiError,        setApiError]        = useState(false)
  const [lastUpdated,     setLastUpdated]     = useState(null)
  const [clock,           setClock]           = useState('')
  const [lang,            setLang]            = useState('en')
  const [darkMode,        setDarkMode]        = useState(true)
  const [selectedDay,     setSelectedDay]     = useState(0)
  const [showCompare,     setShowCompare]     = useState(false)
  const [showCustomLoc,   setShowCustomLoc]   = useState(false)
  const [showRainChart,   setShowRainChart]   = useState(false)
  const [showNearby,      setShowNearby]      = useState(false)
  const [notifEnabled,    setNotifEnabled]    = useState(false)
  const [rainEffect,      setRainEffect]      = useState(false)
  const [manualMode,      setManualMode]      = useState(false)
  const [sliders, setSliders] = useState({ rainfall_mm_1h:5, humidity_pct:70, pressure_hpa:1010, wind_speed_kmh:15, radar_reflectivity_dbz:20, lightning_strikes:0 })
  const intervalRef = useRef(null)
  const notifRef    = useRef(false)

  // ── Apply dark/light mode ────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.background = darkMode ? '#0d1117' : '#f0f2f5'
    document.body.style.color      = darkMode ? '#e6edf3' : '#1a1a2e'
  }, [darkMode])

  // ── Load data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async (loc) => {
    setLoading(true)
    setApiError(false)
    try {
      const [weather, fc, hist] = await Promise.all([
        fetchCurrentWeather(loc.lat, loc.lon),
        fetch5DayForecast(loc.lat, loc.lon),
        fetchHistoricalData(loc.lat, loc.lon),
      ])
      setCurrentWeather(weather)
      setForecast(fc)
      setWeatherHistory(hist)
      const pred = simulatePrediction({ station_id: loc.id, latitude: loc.lat, longitude: loc.lon, ...weather })
      setPrediction(pred)
      // Rain animation for high risk
      setRainEffect(pred.risk_level === 'HIGH' || pred.risk_level === 'CRITICAL')
      // Browser notification
      if (notifEnabled && !notifRef.current && (pred.risk_level === 'HIGH' || pred.risk_level === 'CRITICAL')) {
        notifRef.current = true
        if (Notification.permission === 'granted') {
          new Notification(`Cloudburst Alert — ${loc.name}`, { body: `Risk: ${pred.risk_level} (${Math.round(pred.probability*100)}%)`, icon: '/favicon.ico' })
        }
      } else if (pred.risk_level === 'LOW' || pred.risk_level === 'MODERATE') {
        notifRef.current = false
      }
      setLastUpdated(new Date())
      setLoading(false)
    } catch (err) {
      console.error('API error:', err)
      setApiError(true)
      // Fallback to simulation
      const hist = simulateWeatherHistory(loc.id, 24)
      setWeatherHistory(hist.records)
      const latest = hist.records[hist.records.length - 1]
      const pred = simulatePrediction({ station_id: loc.id, ...latest })
      setPrediction(pred)
      setCurrentWeather(latest)
      setRainEffect(pred.risk_level === 'HIGH' || pred.risk_level === 'CRITICAL')
      setLastUpdated(new Date())
      setLoading(false)
    }
  }, [notifEnabled])

  useEffect(() => {
    loadData(activeLocation)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => loadData(activeLocation), 15 * 60 * 1000)
    return () => clearInterval(intervalRef.current)
  }, [activeLocation, loadData])

  useEffect(() => {
    if (manualMode) {
      const pred = simulatePrediction({ station_id: activeLocation.id, temperature_c:20, ...sliders })
      setPrediction(pred)
    }
  }, [sliders, manualMode, activeLocation])

  useEffect(() => {
    const tick = () => setClock(new Date().toUTCString().slice(17,25))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  // ── Enable notifications ──────────────────────────────────────────────────
  const toggleNotifications = async () => {
    if (!notifEnabled) {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') setNotifEnabled(true)
    } else {
      setNotifEnabled(false)
    }
  }

  // ── Share ─────────────────────────────────────────────────────────────────
  const shareLocation = () => {
    const url = `${window.location.origin}?lat=${activeLocation.lat}&lon=${activeLocation.lon}&name=${encodeURIComponent(activeLocation.name)}`
    if (navigator.share) {
      navigator.share({ title: `Cloudburst Risk — ${activeLocation.name}`, text: `Current risk: ${prediction?.risk_level || 'LOW'} (${Math.round((prediction?.probability||0)*100)}%)`, url })
    } else {
      navigator.clipboard.writeText(url).then(() => alert('Link copied to clipboard!'))
    }
  }

  // ── Download PDF ──────────────────────────────────────────────────────────
  const downloadReport = () => {
    const content = `CLOUDBURST DETECTION SYSTEM — FORECAST REPORT
Location: ${activeLocation.name}, ${activeLocation.state}
Coordinates: ${activeLocation.lat}N, ${activeLocation.lon}E | Elevation: ${activeLocation.elev}m
Generated: ${new Date().toLocaleString()}

CURRENT CONDITIONS
Temperature: ${currentWeather?.temperature_c || '—'}°C
Humidity: ${currentWeather?.humidity_pct || '—'}%
Pressure: ${currentWeather?.pressure_hpa || '—'} hPa
Wind Speed: ${currentWeather?.wind_speed_kmh || '—'} km/h
Rainfall (1h): ${currentWeather?.rainfall_mm_1h || 0} mm

CLOUDBURST RISK ASSESSMENT
Risk Level: ${prediction?.risk_level || '—'}
Probability: ${Math.round((prediction?.probability||0)*100)}%
Model: ${prediction?.model_version || '—'}

7-DAY FORECAST
${forecast.map(d => `${d.label}: ${d.type}, ${d.tempHigh}/${d.tempLow}°C, Rain ${d.rainChance}%, CB Risk ${Math.round(d.cbRisk*100)}% [${d.riskLevel}]`).join('\n')}

RECOMMENDATIONS
${(prediction?.recommendations || []).map((r,i) => `${i+1}. ${r}`).join('\n')}
`
    const blob = new Blob([content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cloudburst-report-${activeLocation.name}-${format(new Date(),'yyyy-MM-dd')}.txt`
    a.click()
  }

  // ── Nearby stations ───────────────────────────────────────────────────────
  const nearbyStations = LOCATIONS
    .map(l => ({ ...l, dist: getDistance(activeLocation.lat, activeLocation.lon, l.lat, l.lon) }))
    .filter(l => l.id !== activeLocation.id)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5)

  // ── Derived ───────────────────────────────────────────────────────────────
  const weather    = currentWeather || {}
  const prevW      = weatherHistory[weatherHistory.length - 4] || weather
  const riskColor  = prediction ? (RISK_COLOR[prediction.risk_level] || '#639922') : '#639922'
  const rainInt    = getRainIntensity(weather.rainfall_mm_1h || 0)
  const chartData  = weatherHistory.slice(-24).map(d => ({
    time:     (() => { try { return d.timestamp ? (d.timestamp.includes('T') ? format(parseISO(d.timestamp),'HH:mm') : d.timestamp.slice(11,16)) : '' } catch { return '' } })(),
    rain:     +(d.rainfall_mm_1h || 0).toFixed(1),
    prob:     +((d.cloudburst_probability || 0) * 100).toFixed(1),
    humidity: +(d.humidity_pct || 0).toFixed(0),
    wind:     +(d.wind_speed_kmh || 0).toFixed(0),
  }))
  const selectedForecast = forecast[selectedDay] || null
  const peakDay    = forecast.length ? forecast.reduce((mx,d) => d.cbRisk > mx.cbRisk ? d : mx, forecast[0]) : null

  const card = { background: darkMode ? '#1c2230' : '#ffffff', border:`0.5px solid ${darkMode ? 'rgba(99,120,170,0.18)' : 'rgba(0,0,0,0.1)'}`, borderRadius:'14px', padding:'18px 20px' }
  const textPrimary   = darkMode ? '#e6edf3' : '#1a1a2e'
  const textSecondary = darkMode ? '#8b949e' : '#6b7280'
  const bgPrimary     = darkMode ? '#0d1117' : '#f0f2f5'
  const bgCard        = darkMode ? '#1c2230' : '#ffffff'
  const bgTopbar      = darkMode ? '#161b22' : '#ffffff'

  return (
    <div style={{ background: bgPrimary, minHeight:'100vh', paddingBottom:'40px', position:'relative', overflow:'hidden' }}>

      {/* RAIN ANIMATION */}
      {rainEffect && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
          {Array.from({length:40}).map((_,i) => (
            <div key={i} style={{
              position:'absolute', top:'-20px', left:`${Math.random()*100}%`,
              width:'2px', height:`${15+Math.random()*25}px`,
              background:'rgba(79,195,247,0.3)', borderRadius:'2px',
              animation:`rainDrop ${0.6+Math.random()*0.8}s linear infinite`,
              animationDelay:`${Math.random()*1.5}s`,
            }} />
          ))}
          <style>{`@keyframes rainDrop { 0%{transform:translateY(-20px);opacity:0} 10%{opacity:1} 90%{opacity:0.8} 100%{transform:translateY(100vh);opacity:0} }`}</style>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ background: bgTopbar, borderBottom:`0.5px solid ${darkMode?'rgba(99,120,170,0.18)':'rgba(0,0,0,0.1)'}`, padding:'10px 20px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
          <div style={{ width:32, height:32, background:'linear-gradient(135deg,#185FA5,#1D9E75)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>⛈️</div>
          <div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:'13px', fontWeight:700, color: textPrimary }}>CLOUDBURST·AI</div>
            <div style={{ fontSize:'10px', color: textSecondary }}>
              {apiError ? '⚠️ Simulated data' : '● Live — OpenWeatherMap'}
            </div>
          </div>
        </div>

        {onBack && (
          <button onClick={onBack} style={{ padding:'6px 12px', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(99,120,170,0.3)', borderRadius:'8px', color:'#8b949e', fontSize:'12px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:'6px', flexShrink:0, transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.color='#e6edf3';e.currentTarget.style.borderColor='rgba(99,120,170,0.6)'}}
            onMouseLeave={e=>{e.currentTarget.style.color='#8b949e';e.currentTarget.style.borderColor='rgba(99,120,170,0.3)'}}>
            ← Home
          </button>
        )}
        <LocationSearch onSelect={loc => { setActiveLocation(loc); setLoading(true); setSelectedDay(0) }} currentName={activeLocation.name} lang={lang} />

        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0, marginLeft:'auto', flexWrap:'wrap' }}>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:'10px', color: textSecondary }}>{clock} UTC</span>

          {/* Language toggle */}
          <button onClick={() => setLang(l => l==='en'?'hi':'en')} title="Toggle Hindi/English"
            style={{ padding:'5px 10px', borderRadius:'16px', border:`0.5px solid ${darkMode?'rgba(99,120,170,0.3)':'rgba(0,0,0,0.2)'}`, background:'transparent', color: textSecondary, fontSize:'11px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>

          {/* Dark mode toggle */}
          <button onClick={() => setDarkMode(d => !d)} title="Toggle dark/light mode"
            style={{ padding:'5px 10px', borderRadius:'16px', border:`0.5px solid ${darkMode?'rgba(99,120,170,0.3)':'rgba(0,0,0,0.2)'}`, background:'transparent', color: textSecondary, fontSize:'13px', cursor:'pointer' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Notifications */}
          <button onClick={toggleNotifications} title={notifEnabled ? 'Disable alerts' : 'Enable browser alerts'}
            style={{ padding:'5px 10px', borderRadius:'16px', border:`0.5px solid ${notifEnabled?'#EF9F27':'rgba(99,120,170,0.3)'}`, background: notifEnabled?'rgba(239,159,39,0.1)':'transparent', color: notifEnabled?'#EF9F27': textSecondary, fontSize:'13px', cursor:'pointer' }}>
            🔔
          </button>

          {/* Share */}
          <button onClick={shareLocation} title="Share forecast"
            style={{ padding:'5px 10px', borderRadius:'16px', border:`0.5px solid rgba(99,120,170,0.3)`, background:'transparent', color: textSecondary, fontSize:'13px', cursor:'pointer' }}>
            🔗
          </button>

          {/* Download */}
          <button onClick={downloadReport} title="Download report"
            style={{ padding:'5px 10px', borderRadius:'16px', border:`0.5px solid rgba(99,120,170,0.3)`, background:'transparent', color: textSecondary, fontSize:'13px', cursor:'pointer' }}>
            ⬇️
          </button>

          {/* Compare */}
          <button onClick={() => setShowCompare(true)} title="Compare cities"
            style={{ padding:'5px 10px', borderRadius:'16px', border:`0.5px solid rgba(99,120,170,0.3)`, background:'transparent', color: textSecondary, fontSize:'11px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Compare
          </button>

          {/* Add custom location */}
          <button onClick={() => setShowCustomLoc(true)} title="Add custom location"
            style={{ padding:'5px 10px', borderRadius:'16px', border:`0.5px solid rgba(79,195,247,0.4)`, background:'rgba(79,195,247,0.08)', color:'#4fc3f7', fontSize:'11px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            + Custom
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:'5px', padding:'4px 9px', border:'0.5px solid rgba(29,158,117,0.4)', borderRadius:'18px', fontSize:'10px', color:'#1D9E75' }}>
            <div className="pulse-dot" style={{ background:'#1D9E75' }}></div>LIVE
          </div>
        </div>
      </div>

      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'18px 20px', position:'relative', zIndex:1 }}>

        {/* LOCATION HEADER */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'8px' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:600, color: textPrimary, margin:0 }}>{activeLocation.name}</h1>
            <p style={{ fontSize:'12px', color: textSecondary, margin:'3px 0 0' }}>
              {activeLocation.state} &nbsp;·&nbsp; {activeLocation.lat.toFixed(4)}°N, {activeLocation.lon.toFixed(4)}°E &nbsp;·&nbsp; {activeLocation.elev}m
              {lastUpdated && <span style={{ marginLeft:'10px', color:'#1D9E75' }}>Updated {format(lastUpdated,'HH:mm:ss')}</span>}
            </p>
          </div>
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            {['Shimla','Manali','Dehradun','Srinagar','Cherrapunji','Mumbai','Kharar'].map(name => {
              const loc = LOCATIONS.find(l => l.name === name)
              return loc ? (
                <button key={name} onClick={() => { setActiveLocation(loc); setSelectedDay(0) }} style={{
                  padding:'3px 10px', borderRadius:'14px', cursor:'pointer', fontSize:'11px', fontFamily:"'DM Sans',sans-serif", transition:'all .15s',
                  border:`0.5px solid ${activeLocation.name===name?'#185FA5':'rgba(99,120,170,0.25)'}`,
                  background: activeLocation.name===name?'#185FA5':'transparent',
                  color: activeLocation.name===name?'#fff': textSecondary,
                }}>{name}</button>
              ) : null
            })}
            <button onClick={() => setShowNearby(s => !s)} style={{ padding:'3px 10px', borderRadius:'14px', cursor:'pointer', fontSize:'11px', fontFamily:"'DM Sans',sans-serif", border:`0.5px solid ${showNearby?'#1D9E75':'rgba(99,120,170,0.25)'}`, background: showNearby?'rgba(29,158,117,0.1)':'transparent', color: showNearby?'#1D9E75': textSecondary }}>
              Nearby ▼
            </button>
          </div>
        </div>

        {/* NEARBY PANEL */}
        {showNearby && (
          <div style={{ ...card, marginBottom:'12px', padding:'14px 18px' }}>
            <p style={{ fontSize:'11px', color: textSecondary, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'10px', margin:'0 0 10px' }}>5 Nearest Stations to {activeLocation.name}</p>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {nearbyStations.map(s => (
                <div key={s.id} onClick={() => { setActiveLocation(s); setShowNearby(false); setSelectedDay(0) }}
                  style={{ padding:'8px 12px', borderRadius:'8px', background: darkMode?'#161b22':'#f5f5f5', border:'0.5px solid rgba(99,120,170,0.2)', cursor:'pointer', minWidth:'140px' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#185FA5'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='rgba(99,120,170,0.2)'}>
                  <div style={{ fontSize:'12px', color: textPrimary, fontWeight:500 }}>{s.name}</div>
                  <div style={{ fontSize:'10px', color: textSecondary, marginTop:'2px' }}>{s.state}</div>
                  <div style={{ fontSize:'10px', color:'#4fc3f7', marginTop:'3px' }}>{s.dist.toFixed(0)} km away</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALERT BANNER */}
        {prediction && prediction.risk_level !== 'LOW' && (
          <div style={{ marginBottom:'14px' }}>
            <AlertBanner riskLevel={prediction.risk_level} probability={prediction.probability}
              stationName={activeLocation.name} recommendations={prediction.recommendations} />
          </div>
        )}

        {/* API STATUS BADGE */}
        {apiError && (
          <div style={{ marginBottom:'12px', padding:'8px 14px', background:'rgba(239,159,39,0.1)', border:'0.5px solid rgba(239,159,39,0.4)', borderRadius:'8px', fontSize:'12px', color:'#EF9F27' }}>
            ⚠️ Could not reach OpenWeatherMap API — showing simulated data. Check your internet connection or try again later.
          </div>
        )}

        {/* METRIC CARDS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'10px', marginBottom:'14px' }}>
          <MetricCard label={lang==='hi'?HINDI.rainfall:'Rainfall 1h'} value={(weather.rainfall_mm_1h||0).toFixed(1)} unit="mm"
            delta={(weather.rainfall_mm_1h||0)-(prevW.rainfall_mm_1h||0)}
            deltaLabel={`${Math.abs(((weather.rainfall_mm_1h||0)-(prevW.rainfall_mm_1h||0))).toFixed(1)} mm vs prev`} colorize />
          <MetricCard label={lang==='hi'?HINDI.humidity:'Humidity'} value={(weather.humidity_pct||0).toFixed(0)} unit="%"
            deltaLabel={(weather.humidity_pct||0)>90?'very high':(weather.humidity_pct||0)>75?'elevated':'normal'}
            colorize delta={(weather.humidity_pct||0)>90?1:-1} />
          <MetricCard label={lang==='hi'?HINDI.pressure:'Pressure'} value={(weather.pressure_hpa||0).toFixed(1)} unit="hPa"
            delta={(weather.pressure_hpa||0)-(prevW.pressure_hpa||0)}
            deltaLabel={`${(weather.pressure_hpa||0)-(prevW.pressure_hpa||0)>=0?'stable':'dropping'} ${Math.abs(((weather.pressure_hpa||0)-(prevW.pressure_hpa||0))).toFixed(1)} hPa`} />
          <MetricCard label={lang==='hi'?HINDI.wind:'Wind Speed'} value={(weather.wind_speed_kmh||0).toFixed(0)} unit="km/h"
            deltaLabel={(weather.wind_speed_kmh||0)>40?'strong':(weather.wind_speed_kmh||0)>20?'moderate':'light'}
            colorize delta={(weather.wind_speed_kmh||0)>30?1:-1} />
        </div>

        {/* EXTRA METRICS ROW */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'10px', marginBottom:'14px' }}>
          <div style={{ ...card, padding:'12px 14px' }}>
            <p style={{ fontSize:'10px', color: textSecondary, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.4px' }}>Feels Like</p>
            <p style={{ fontFamily:"'Space Mono',monospace", fontSize:'18px', fontWeight:700, color: textPrimary, margin:0 }}>{weather.feels_like || '—'}°C</p>
          </div>
          <div style={{ ...card, padding:'12px 14px' }}>
            <p style={{ fontSize:'10px', color: textSecondary, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.4px' }}>Rain Intensity</p>
            <p style={{ fontSize:'13px', fontWeight:600, color: rainInt.color, margin:0 }}>{rainInt.label}</p>
            <p style={{ fontSize:'10px', color: textSecondary, margin:'2px 0 0' }}>{weather.rainfall_mm_1h||0} mm/h</p>
          </div>
          <div style={{ ...card, padding:'12px 14px' }}>
            <p style={{ fontSize:'10px', color: textSecondary, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.4px' }}>Cloud Cover</p>
            <p style={{ fontFamily:"'Space Mono',monospace", fontSize:'18px', fontWeight:700, color: textPrimary, margin:0 }}>{weather.cloud_cover_pct||0}%</p>
          </div>
          <div style={{ ...card, padding:'12px 14px' }}>
            <p style={{ fontSize:'10px', color: textSecondary, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.4px' }}>Visibility</p>
            <p style={{ fontFamily:"'Space Mono',monospace", fontSize:'18px', fontWeight:700, color: textPrimary, margin:0 }}>{weather.visibility_km||10} km</p>
          </div>
        </div>

        {/* MAIN GRID */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:'14px', marginBottom:'14px' }}>
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <p style={{ fontSize:'11px', fontWeight:500, color: textSecondary, textTransform:'uppercase', letterSpacing:'0.6px', margin:0 }}>
                {lang==='hi'?'24 घंटे का रुझान':'24-Hour Weather Trend'}
              </p>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setShowRainChart(false)} style={{ fontSize:'10px', padding:'3px 8px', borderRadius:'8px', border:'0.5px solid rgba(99,120,170,0.3)', background: !showRainChart?'#185FA5':'transparent', color:!showRainChart?'#fff': textSecondary, cursor:'pointer' }}>Trend</button>
                <button onClick={() => setShowRainChart(true)} style={{ fontSize:'10px', padding:'3px 8px', borderRadius:'8px', border:'0.5px solid rgba(99,120,170,0.3)', background: showRainChart?'#185FA5':'transparent', color:showRainChart?'#fff': textSecondary, cursor:'pointer' }}>Rain Chart</button>
              </div>
            </div>
            {loading ? (
              <div style={{ height:'200px', display:'flex', alignItems:'center', justifyContent:'center', color: textSecondary, fontSize:'12px' }}>{lang==='hi'?HINDI.loading:'Loading live data...'}</div>
            ) : showRainChart ? (
              <div>
                <div style={{ display:'flex', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
                  {[['None','#484f58',[0,0]],['Light','#4fc3f7',[0,2.5]],['Moderate','#185FA5',[2.5,7.5]],['Heavy','#EF9F27',[7.5,35]],['Extreme','#E24B4A',[35,500]]].map(([lbl,col]) => (
                    <span key={lbl} style={{ fontSize:'10px', color:col, padding:'2px 7px', border:`0.5px solid ${col}44`, borderRadius:'8px', background:`${col}15` }}>{lbl}</span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top:0,right:0,left:-20,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,120,170,0.08)" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: textSecondary, fontSize:9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: textSecondary, fontSize:9 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: bgCard, border:'0.5px solid rgba(99,120,170,0.3)', borderRadius:'8px', fontSize:'11px' }} />
                    <ReferenceLine y={100} stroke="#E24B4A" strokeDasharray="4 2" label={{ value:'Cloudburst', fill:'#E24B4A', fontSize:9, position:'right' }} />
                    <ReferenceLine y={35} stroke="#EF9F27" strokeDasharray="4 2" label={{ value:'Heavy', fill:'#EF9F27', fontSize:9, position:'right' }} />
                    <Bar dataKey="rain" name="Rain mm/h" fill="#185FA5" radius={[2,2,0,0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <WeatherChart data={weatherHistory.slice(-24)} height={200} />
            )}
          </div>
          <div style={{ ...card, display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
            <p style={{ fontSize:'11px', fontWeight:500, color: textSecondary, textTransform:'uppercase', letterSpacing:'0.6px', alignSelf:'flex-start', width:'100%', margin:0 }}>
              {lang==='hi'?HINDI.risk:'Cloudburst Risk'}
            </p>
            <RiskGauge probability={prediction?.probability||0} riskLevel={prediction?.risk_level||'LOW'} size={145} />
            <div style={{ width:'100%' }}>
              <p style={{ fontSize:'11px', color: textSecondary, marginBottom:'6px', fontWeight:500 }}>Factors</p>
              <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                {(prediction?.contributing_factors||[]).map((f,i) => (
                  <li key={i} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'4px 0', borderBottom:'0.5px solid rgba(99,120,170,0.1)', fontSize:'11px' }}>
                    <span style={{ width:6,height:6,borderRadius:'50%',flexShrink:0,background:f.severity==='high'?'#E24B4A':f.severity==='moderate'?'#EF9F27':'#639922' }}></span>
                    <span style={{ flex:1, color: textPrimary }}>{f.factor}</span>
                    <span style={{ fontFamily:"'Space Mono',monospace",fontSize:'10px',color: textSecondary }}>{f.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 7-DAY FORECAST */}
        <div style={{ ...card, marginBottom:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
            <p style={{ fontSize:'11px', fontWeight:500, color: textSecondary, textTransform:'uppercase', letterSpacing:'0.6px', margin:0 }}>
              {lang==='hi'?HINDI.forecast:'7-Day Cloudburst Forecast'} — {activeLocation.name}
              {apiError ? <span style={{ marginLeft:'8px', fontSize:'10px', color:'#EF9F27' }}>(Simulated)</span> : <span style={{ marginLeft:'8px', fontSize:'10px', color:'#1D9E75' }}>(Live)</span>}
            </p>
            {peakDay && <span style={{ fontSize:'11px', color: textSecondary }}>Peak: {peakDay.label} — {Math.round(peakDay.cbRisk*100)}%</span>}
          </div>
          <div style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'4px' }}>
            {forecast.length > 0
              ? forecast.map((day, i) => <ForecastCard key={i} day={day} selected={selectedDay===i} onClick={() => setSelectedDay(i)} lang={lang} />)
              : <div style={{ color: textSecondary, fontSize:'12px', padding:'20px 0' }}>Loading forecast...</div>
            }
          </div>

          {/* Hourly breakdown for selected day */}
          {selectedForecast?.hourly?.length > 0 && (
            <div style={{ marginTop:'14px', paddingTop:'14px', borderTop:'0.5px solid rgba(99,120,170,0.12)' }}>
              <p style={{ fontSize:'11px', color: textSecondary, marginBottom:'10px', fontWeight:500 }}>Hourly — {selectedForecast.label}</p>
              <div style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'4px' }}>
                {selectedForecast.hourly.map((h, i) => (
                  <div key={i} style={{ flexShrink:0, textAlign:'center', padding:'8px 10px', background: darkMode?'#161b22':'#f5f5f5', borderRadius:'8px', minWidth:'64px', border:`0.5px solid ${h.rain>10?'rgba(239,159,39,0.4)':h.rain>0?'rgba(79,195,247,0.3)':'rgba(99,120,170,0.15)'}` }}>
                    <div style={{ fontSize:'10px', color: textSecondary, marginBottom:'4px' }}>{h.time}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:'12px', fontWeight:700, color: textPrimary }}>{h.temp}°</div>
                    <div style={{ fontSize:'10px', color:'#4fc3f7', marginTop:'3px' }}>{h.rain>0?h.rain+'mm':'—'}</div>
                    <div style={{ fontSize:'9px', color: textSecondary, marginTop:'2px' }}>{h.humidity}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk summary */}
          {forecast.length > 0 && (
            <div style={{ display:'flex', gap:'7px', marginTop:'12px', paddingTop:'12px', borderTop:'0.5px solid rgba(99,120,170,0.1)', flexWrap:'wrap', alignItems:'center' }}>
              {['LOW','MODERATE','HIGH','CRITICAL'].map(level => {
                const count = forecast.filter(d => d.riskLevel === level).length
                return count ? <span key={level} style={{ fontSize:'11px', padding:'3px 9px', borderRadius:'10px', background:`${RISK_COLOR[level]}18`, color:RISK_COLOR[level], border:`0.5px solid ${RISK_COLOR[level]}44` }}>{count}d {lang==='hi'?HINDI[level]:level}</span> : null
              })}
            </div>
          )}
        </div>

        {/* MANUAL PREDICTION */}
        <div style={{ ...card, marginBottom:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <p style={{ fontSize:'11px', fontWeight:500, color: textSecondary, textTransform:'uppercase', letterSpacing:'0.6px', margin:0 }}>Manual Prediction</p>
            <label style={{ display:'flex', alignItems:'center', gap:'7px', fontSize:'12px', color: textSecondary, cursor:'pointer' }}>
              <input type="checkbox" checked={manualMode} onChange={e => setManualMode(e.target.checked)} />
              Enable
            </label>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
            {[
              { key:'rainfall_mm_1h', label:'Rainfall (mm/h)', min:0, max:200, step:1 },
              { key:'humidity_pct',   label:'Humidity (%)',    min:30, max:100, step:1 },
              { key:'pressure_hpa',   label:'Pressure (hPa)', min:980, max:1025, step:0.5 },
              { key:'wind_speed_kmh', label:'Wind (km/h)',     min:0, max:100, step:1 },
              { key:'radar_reflectivity_dbz', label:'Radar (dBZ)', min:0, max:75, step:1 },
              { key:'lightning_strikes', label:'Lightning/h',  min:0, max:100, step:1 },
            ].map(({ key, label, min, max, step }) => (
              <div key={key} style={{ background: darkMode?'#161b22':'#f5f5f5', borderRadius:'8px', padding:'9px 11px', border:'0.5px solid rgba(99,120,170,0.15)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                  <span style={{ fontSize:'10px', color: textSecondary }}>{label}</span>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:'10px', fontWeight:700, color: textPrimary }}>{sliders[key]}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={sliders[key]} disabled={!manualMode}
                  onChange={e => setSliders(s => ({ ...s, [key]: +e.target.value }))}
                  style={{ width:'100%', opacity: manualMode?1:0.35 }} />
              </div>
            ))}
          </div>
          {!manualMode && <p style={{ fontSize:'11px', color: textSecondary, textAlign:'center', marginTop:'8px' }}>Tick "Enable" to adjust sliders</p>}
        </div>

        {/* BOTTOM ROW */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'14px' }}>
          <div style={card}>
            <p style={{ fontSize:'11px', fontWeight:500, color: textSecondary, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'10px', marginTop:0 }}>Humidity & Wind (24h)</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{ top:0,right:0,left:-20,bottom:0 }}>
                <defs>
                  <linearGradient id="humG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#185FA5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#185FA5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,120,170,0.08)" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: textSecondary, fontSize:9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: textSecondary, fontSize:9 }} tickLine={false} axisLine={false} domain={[0,110]} />
                <Tooltip contentStyle={{ background: bgCard, border:'0.5px solid rgba(99,120,170,0.3)', borderRadius:'8px', fontSize:'11px' }} />
                <Area type="monotone" dataKey="humidity" name="Humidity %" stroke="#185FA5" strokeWidth={1.5} fill="url(#humG)" dot={false} />
                <Area type="monotone" dataKey="wind"     name="Wind km/h"  stroke="#7f77dd" strokeWidth={1.5} fill="none"       dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={card}>
            <p style={{ fontSize:'11px', fontWeight:500, color: textSecondary, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'12px', marginTop:0 }}>Model Performance</p>
            {[{ label:'Accuracy', value:99.0, color:'#185FA5' },{ label:'Recall', value:98.1, color:'#1D9E75' },{ label:'Precision', value:92.4, color:'#EF9F27' },{ label:'AUC-ROC', value:99.9, color:'#7f77dd' }].map(({ label, value, color }) => (
              <div key={label} style={{ marginBottom:'9px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px', fontSize:'12px' }}>
                  <span style={{ color: textSecondary }}>{label}</span>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, color: textPrimary }}>{value}%</span>
                </div>
                <div style={{ background:'rgba(99,120,170,0.1)', borderRadius:'4px', height:'4px' }}>
                  <div style={{ width:`${value}%`, height:'100%', background:color, borderRadius:'4px' }}></div>
                </div>
              </div>
            ))}
          </div>

          <div style={card}>
            <p style={{ fontSize:'11px', fontWeight:500, color: textSecondary, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'12px', marginTop:0 }}>
              {lang==='hi'?HINDI.recommendations:'Recommendations'}
              <span style={{ marginLeft:'7px', padding:'2px 7px', borderRadius:'9px', fontSize:'10px', background:`${riskColor}22`, color:riskColor, border:`0.5px solid ${riskColor}44` }}>{lang==='hi'?HINDI[prediction?.risk_level||'LOW']:prediction?.risk_level||'LOW'}</span>
            </p>
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {(prediction?.recommendations||['Monitor weather updates hourly','No immediate action required']).map((rec,i) => (
                <li key={i} style={{ display:'flex', gap:'7px', padding:'6px 0', borderBottom:'0.5px solid rgba(99,120,170,0.1)', fontSize:'12px' }}>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:'9px', color:riskColor, background:`${riskColor}18`, padding:'1px 5px', borderRadius:'4px', flexShrink:0, alignSelf:'flex-start', marginTop:'1px' }}>{String(i+1).padStart(2,'0')}</span>
                  <span style={{ color: darkMode?'#c9d1d9':'#374151', lineHeight:1.5 }}>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* MODALS */}
      {showCompare && <CompareModal onClose={() => setShowCompare(false)} primaryLoc={activeLocation} primaryWeather={{ ...currentWeather, prediction }} lang={lang} />}
      {showCustomLoc && <CustomLocModal onClose={() => setShowCustomLoc(false)} onAdd={loc => { setActiveLocation(loc); setShowCustomLoc(false) }} />}

    </div>
  )
}
