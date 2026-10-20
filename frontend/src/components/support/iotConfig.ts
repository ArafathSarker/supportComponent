export interface IotFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  helpText?: string;
}

export interface ProblemCategoryConfig {
  category: string;
  badge: string;
  description: string;
  dynamicFields: IotFieldDefinition[];
  troubleshootingChecklist: string[];
}

export const GARMENTS_IOT_CATEGORIES: ProblemCategoryConfig[] = [
  // 1. Hardware / Sensor / Device Problem (From System Pic)
  {
    category: 'Hardware / Sensor / Device Problem',
    badge: 'Hardware / Sensor',
    description: 'Physical IoT sensors, optical needle counters, temperature probes, vibration sensors, and telemetry hardware.',
    dynamicFields: [
      {
        key: 'sensor_id',
        label: 'Sensor / Hardware Device Tag ID',
        type: 'text',
        placeholder: 'e.g. SEN-OP-402, PR-TRANS-104, IOT-BOX-12',
        required: true,
        helpText: 'Printed on the physical sensor housing or mounting plate'
      },
      {
        key: 'machine_model',
        label: 'Attached Machine Model & Line',
        type: 'text',
        placeholder: 'e.g. Juki DDL-9000C (Line 04), Pegasus Overlock, Main Boiler',
        required: true
      },
      {
        key: 'led_indicator',
        label: 'Hardware Power & LED Indicator State',
        type: 'select',
        options: [
          'Steady Green (Normal Operation)',
          'Blinking Green (Telemetry Activity Detected)',
          'Solid Red (Hardware Fault / Sensor Tripped)',
          'Rapid Flashing Amber (Loss of Synchronization)',
          'Completely Dark / No Power LED'
        ],
        required: true
      },
      {
        key: 'telemetry_reading',
        label: 'Observed Telemetry / Analog Value',
        type: 'text',
        placeholder: 'e.g. 0 RPM (flatline), 7.2 Bar, NaN, Overheating 95°C',
        required: true
      },
      {
        key: 'cable_condition',
        label: 'Sensor Harness & Cable Condition',
        type: 'select',
        options: [
          'Firmly Connected & Free of Damage',
          'Loose / Intermittent Pin Connection',
          'Pinched by Machine Frame or Table Stand',
          'Damaged Insulation / Oil Soaked Cable'
        ]
      }
    ],
    troubleshootingChecklist: [
      'Cleaned optical sensor lens and reflector of fabric lint, thread debris, and machine oil',
      'Checked that 24V DC / 5V DC auxiliary power adapter LED indicator is actively illuminated',
      'Verified sensor alignment and mechanical gap (standard tolerance is 1.5mm - 3.0mm)',
      'Performed a 30-second power-cycle on the sensor junction terminal box'
    ]
  },

  // 2. Software / Firmware / App Bug (From System Pic)
  {
    category: 'Software / Firmware / App Bug',
    badge: 'Software / Firmware',
    description: 'IoT edge controller firmware, telemetry ingestion parsers, tablet application bugs, and MQTT exceptions.',
    dynamicFields: [
      {
        key: 'app_version',
        label: 'App Build / Edge Firmware Version',
        type: 'text',
        placeholder: 'e.g. v3.4.2-firmware, Android Tablet v2.1.0',
        required: true
      },
      {
        key: 'subsystem_affected',
        label: 'Affected Software Subsystem',
        type: 'select',
        options: [
          'Edge Gateway Firmware Data Collector',
          'MQTT Telemetry Message Broker',
          'Production Logging Tablet App',
          'Real-time Analytics Ingestion Engine',
          'Database Sync Worker'
        ],
        required: true
      },
      {
        key: 'error_code_log',
        label: 'Error Code or Console / Log Snippet',
        type: 'text',
        placeholder: 'e.g. ERR_MQTT_CONN_LOST, Code 500 JSON parse exception'
      },
      {
        key: 'reproducibility',
        label: 'Bug Frequency & Behavior',
        type: 'select',
        options: [
          'Consistently Reproducible (Always Occurs)',
          'Intermittent / Random During Peak Shifts',
          'Occurs Only After Machine Power Cycle',
          'Occurs When Multiple Operators Log In Simultaneously'
        ]
      }
    ],
    troubleshootingChecklist: [
      'Checked system event logs or tablet crash dialog for exception error codes',
      'Verified edge controller is running certified stable firmware release',
      'Cleared local application cache and restarted the logging application',
      'Tested service connectivity to MQTT broker endpoint'
    ]
  },

  // 3. Network / Connectivity Issue (From System Pic)
  {
    category: 'Network / Connectivity Issue',
    badge: 'Network / Gateway',
    description: 'Floor LoRaWAN concentrators, industrial PoE switches, factory Wi-Fi mesh drops, and 4G modem links.',
    dynamicFields: [
      {
        key: 'gateway_mac',
        label: 'Gateway Identifier / MAC Address',
        type: 'text',
        placeholder: 'e.g. GW-SEWING-FL2-NORTH, B8:27:EB:D3:5F:11',
        required: true,
        helpText: 'Labeled on top of the industrial DIN-rail gateway enclosure'
      },
      {
        key: 'connection_type',
        label: 'Upstream Network Physical Interface',
        type: 'select',
        options: [
          'Industrial PoE Ethernet (RJ-45)',
          'LoRaWAN 868 / 915 MHz Sub-GHz Concentrator',
          'Factory Wi-Fi (2.4 / 5 GHz Industrial Mesh)',
          '4G LTE Industrial Cellular SIM Router',
          'RS-485 Modbus RTU Serial Daisy-Chain'
        ],
        required: true
      },
      {
        key: 'signal_rssi',
        label: 'Signal Strength / Connection Status',
        type: 'select',
        options: [
          'Total Disconnect (100% Packet Loss)',
          'Weak Signal / High Jitter (RSSI < -90 dBm)',
          'Intermittent Dropouts Every Few Minutes',
          'DNS / Subnet Routing Failure'
        ],
        required: true
      },
      {
        key: 'affected_zone',
        label: 'Affected Factory Floor Zone',
        type: 'text',
        placeholder: 'e.g. Floor 2 Sewing Lines 01-08, Boiler Basement'
      }
    ],
    troubleshootingChecklist: [
      'Verified physical Ethernet RJ-45 PoE link LED lights are flashing green/amber',
      'Confirmed external LoRaWAN / Wi-Fi antenna is upright and firmly screwed on',
      'Power-cycled the industrial gateway or PoE power injector for 60 seconds',
      'Verified factory floor LAN switch port and upstream gateway route are online'
    ]
  },

  // 4. Data / Export / Reporting Issue (From System Pic)
  {
    category: 'Data / Export / Reporting Issue',
    badge: 'Data / Reporting',
    description: 'Missing stitch count logs, production analytics discrepancies, CSV/Excel export failures, and OEE reports.',
    dynamicFields: [
      {
        key: 'report_type',
        label: 'Target Report / Analytics View',
        type: 'select',
        options: [
          'Daily Floor Production & Piece-Rate Summary',
          'Machine Uptime & Downtime OEE Log',
          'Stitch Telemetry & Cycle Time Raw Export',
          'Steam / Energy Consumption Trend Report',
          'Operator Efficiency & Performance Matrix'
        ],
        required: true
      },
      {
        key: 'export_format',
        label: 'Export Format Affected',
        type: 'select',
        options: [
          'Microsoft Excel (.xlsx)',
          'Comma-Separated Values (.csv)',
          'PDF Production Report',
          'Live REST API / Webhook Payload'
        ],
        required: true
      },
      {
        key: 'date_range',
        label: 'Affected Date Range',
        type: 'text',
        placeholder: 'e.g. 2026-10-18 to 2026-10-20, Morning Shift',
        required: true
      },
      {
        key: 'data_variance',
        label: 'Observed Data Discrepancy',
        type: 'text',
        placeholder: 'e.g. 2-hour data gap between 10 AM - 12 PM, Output reads 0 while machines were running'
      }
    ],
    troubleshootingChecklist: [
      'Checked if raw live telemetry is actively streaming in the dashboard before export',
      'Verified query date range does not exceed standard 90-day archive bounds',
      'Tested exporting data in alternate format (e.g. CSV instead of Excel)',
      'Confirmed browser popup blocker is not suppressing file download'
    ]
  },

  // 5. SCADA / Dashboard / Display Issue (From System Pic)
  {
    category: 'SCADA / Dashboard / Display Issue',
    badge: 'SCADA / Display',
    description: 'Floor wall monitors, SCADA mimic panels, live floor heatmaps, and overhead LED Andon displays.',
    dynamicFields: [
      {
        key: 'display_terminal',
        label: 'Display Interface / Screen Location',
        type: 'text',
        placeholder: 'e.g. Overhead TV Line 05, Central Control Room Monitor 2, Kiosk Tablet',
        required: true
      },
      {
        key: 'widget_element',
        label: 'Affected SCADA / UI Element',
        type: 'select',
        options: [
          'Live Sewing Line Floor Heatmap',
          'Boiler & Compressor Pressure Gauge Mimic',
          'Real-time Hourly Target vs Actual Gauge',
          'Real-time Machine Status Grid (Red/Yellow/Green)',
          'Top Alarm Notification Banner'
        ],
        required: true
      },
      {
        key: 'screen_state',
        label: 'Screen Anomaly Observed',
        type: 'select',
        options: [
          'Frozen / Telemetry Stale (Timestamp Not Updating)',
          'White / Blank Screen or Browser Error 502',
          'WebSocket Reconnecting Spinner Loop',
          'Values Displaying as NaN or Null'
        ],
        required: true
      }
    ],
    troubleshootingChecklist: [
      'Verified browser WebSocket status indicator in top-right indicates "Connected"',
      'Performed a hard page reload (Ctrl + Shift + R) on the display computer',
      'Inspected HDMI video cable and power adapter to the display micro-PC',
      'Confirmed SCADA WebSocket server endpoint is accessible from display terminal'
    ]
  },

  // 6. User Account / Access / Permission (From System Pic)
  {
    category: 'User Account / Access / Permission',
    badge: 'Access / Security',
    description: 'Supervisor logins, operator RFID badge authorization, floor supervisor permissions, and role provisioning.',
    dynamicFields: [
      {
        key: 'user_identity',
        label: 'Target User Email / Employee ID / Badge ID',
        type: 'text',
        placeholder: 'e.g. arafath@csismart.com, EMP-4019, RFID #88129',
        required: true
      },
      {
        key: 'role_requested',
        label: 'Required Permission Role',
        type: 'select',
        options: [
          'Floor Supervisor (Line Overrides & Shift Sign-off)',
          'Maintenance Engineer (Sensor Calibration & Diagnostics)',
          'Production Viewer (Read-only Floor Analytics)',
          'Company Administrator (Full Tenant Admin)',
          'Line Operator (Barcode & Bundle Input)'
        ],
        required: true
      },
      {
        key: 'access_error',
        label: 'Observed Access Error Message',
        type: 'select',
        options: [
          '403 Forbidden / Insufficient Privileges',
          'Invalid Username or Password (Lockout)',
          'RFID Badge Scan Unrecognized',
          'Session Expired Immediately on Login'
        ]
      }
    ],
    troubleshootingChecklist: [
      'Verified correct spelling of user email address and employee code',
      'Confirmed user account is marked active in company user registry',
      'Checked if password reset link was received in registered inbox',
      'Verified user is accessing system from authorized company network IP'
    ]
  },

  // 7. Billing / Subscription / License (From System Pic)
  {
    category: 'Billing / Subscription / License',
    badge: 'Billing / License',
    description: 'IoT device license renewals, cloud telemetry tiers, gateway quota expansion, and subscription invoices.',
    dynamicFields: [
      {
        key: 'license_ref',
        label: 'License Key / Subscription Reference',
        type: 'text',
        placeholder: 'e.g. LIC-CSI-GARMENT-2026, PO-10492',
        required: true
      },
      {
        key: 'device_tier',
        label: 'Licensed Device Capacity Tier',
        type: 'select',
        options: [
          'Tier 1 (Up to 50 Machines / 2 Gateways)',
          'Tier 2 (Up to 150 Machines / 5 Gateways)',
          'Tier 3 (Up to 500 Machines / Enterprise Factory)',
          'Unlimited Multi-Floor Enterprise SLA'
        ],
        required: true
      },
      {
        key: 'billing_inquiry',
        label: 'Nature of Billing Request',
        type: 'select',
        options: [
          'Extend Active Subscription Period',
          'Add Additional Machine Sensor Licenses',
          'Request Official Commercial Invoice / VAT Receipt',
          'License Key Activation / Expiration Warning'
        ],
        required: true
      }
    ],
    troubleshootingChecklist: [
      'Checked current active machine count against licensed quota',
      'Reviewed subscription expiration date on billing dashboard',
      'Confirmed official corporate finance contact details are updated'
    ]
  },

  // 8. Installation / Commissioning (From System Pic)
  {
    category: 'Installation / Commissioning',
    badge: 'Commissioning',
    description: 'New garment line IoT rollout, sensor mounting on sewing machines, gateway positioning, and onboarding.',
    dynamicFields: [
      {
        key: 'installation_line',
        label: 'Factory Section / New Line Number',
        type: 'text',
        placeholder: 'e.g. Building 1 - New Sewing Line 17, Cutter Section C',
        required: true
      },
      {
        key: 'equipment_count',
        label: 'Number of Machines to Commission',
        type: 'text',
        placeholder: 'e.g. 28 Juki Overlock Machines, 2 Gateways',
        required: true
      },
      {
        key: 'target_golive_date',
        label: 'Target Commissioning / Go-Live Date',
        type: 'text',
        placeholder: 'e.g. 2026-11-05',
        required: true
      },
      {
        key: 'installation_stage',
        label: 'Current Installation Stage',
        type: 'select',
        options: [
          'Pre-Installation Site Assessment & Power Drop Verification',
          'Physical Sensor Bracket Mounting on Sewing Stands',
          'Gateway Network Cable Termination & Uplink Test',
          'Telemetry Calibration & Operator Training Stage'
        ],
        required: true
      }
    ],
    troubleshootingChecklist: [
      'Verified factory floor power drops (24V DC / 220V AC) are pre-wired and tested',
      'Confirmed network cable drop (PoE RJ-45) is installed at gateway mounting point',
      'Inspected sensor bracket clearance with sewing machine mechanical moving parts',
      'Prepared machine asset serial number list for digital twin registration'
    ]
  },

  // 9. Other / General Enquiry (From System Pic)
  {
    category: 'Other / General Enquiry',
    badge: 'General Enquiry',
    description: 'Custom IoT telemetry inquiries, sensor integration consultation, operator training, and general support.',
    dynamicFields: [
      {
        key: 'enquiry_topic',
        label: 'Enquiry Topic',
        type: 'text',
        placeholder: 'e.g. Third-party sensor integration, Custom ERP API sync',
        required: true
      },
      {
        key: 'contact_person',
        label: 'Floor Contact Person & Phone',
        type: 'text',
        placeholder: 'e.g. Mr. Rafiq (Factory Maintenance Lead) - +880 1700-000000',
        required: true
      },
      {
        key: 'preferred_channel',
        label: 'Preferred Response / Assistance Method',
        type: 'select',
        options: [
          'Support Ticket Live Chat',
          'On-Site Field Engineer Dispatch',
          'Remote Video Conference & Screen Sharing',
          'Direct Phone Consultation'
        ]
      }
    ],
    troubleshootingChecklist: [
      'Reviewed system user guides and troubleshooting documentation',
      'Verified contact phone number and factory location details',
      'Compiled specific requirements or diagnostic notes for support team'
    ]
  },

  // 10. Specialized: Sewing Machine IoT Tracker & Needle Sensor
  {
    category: 'Sewing Machine IoT Tracker & Needle Sensor',
    badge: 'Hardware / Sensor',
    description: 'RPM counters, optical needle sensors, stitch pulse monitors, and thread break sensors on sewing lines.',
    dynamicFields: [
      {
        key: 'sensor_id',
        label: 'Sensor / IoT Module ID',
        type: 'text',
        placeholder: 'e.g. SEN-NEEDLE-402, IOT-STITCH-14',
        required: true,
        helpText: 'Printed on the sensor module label mounted near the handwheel'
      },
      {
        key: 'machine_model',
        label: 'Sewing Machine Model & Brand',
        type: 'text',
        placeholder: 'e.g. Juki DDL-9000C, Brother S-7200A, Pegasus Overlock',
        required: true
      },
      {
        key: 'led_indicator',
        label: 'Sensor Hardware LED Status',
        type: 'select',
        options: [
          'Steady Green (Normal Sensing)',
          'Blinking Green (Pulse Detected)',
          'Solid Red (Internal Sensor Fault)',
          'Rapid Flashing Amber (Telemetry Sync Error)',
          'No Light / Completely Dark (Unpowered)'
        ],
        required: true
      },
      {
        key: 'cable_status',
        label: 'Sensor Wiring & Connector Condition',
        type: 'select',
        options: [
          'Firmly Plugged & Undamaged',
          'Loose / Intermittent Jiggling',
          'Pinched / Clipped by Machine Stand',
          'Exposed Wires / Damaged Insulation'
        ]
      }
    ],
    troubleshootingChecklist: [
      'Cleaned optical sensor lens and reflector of fabric lint, thread debris, and machine oil',
      'Verified sensor alignment with handwheel magnet / reflector (gap must be 1.5mm - 3.0mm)',
      'Checked that 24V DC / 5V DC power adapter LED indicator is actively illuminated',
      'Conducted a 15-second power-cycle on the sewing machine IoT junction box'
    ]
  },

  // 11. Specialized: Factory Floor LoRaWAN / WiFi Edge Gateway
  {
    category: 'Factory Floor LoRaWAN / WiFi Edge Gateway',
    badge: 'Network / Gateway',
    description: 'Floor telemetry concentrators, industrial switches, and line communication gateways.',
    dynamicFields: [
      {
        key: 'gateway_id',
        label: 'Gateway Identifier / MAC Address',
        type: 'text',
        placeholder: 'e.g. GW-SEWING-FL2-NORTH, B8:27:EB:D3:5F',
        required: true,
        helpText: 'Labeled on top of the industrial DIN-rail gateway enclosure'
      },
      {
        key: 'connectivity_type',
        label: 'Upstream Network Interface',
        type: 'select',
        options: [
          'Industrial Ethernet RJ-45 (PoE)',
          'LoRaWAN 868/915 MHz Sub-GHz',
          'Factory Wi-Fi (2.4/5GHz Mesh)',
          '4G LTE Industrial Cellular Modem',
          'RS-485 / Modbus RTU Bus'
        ],
        required: true
      },
      {
        key: 'signal_issue',
        label: 'Observed Telemetry Fault',
        type: 'select',
        options: [
          'Total Offline (100% Packet Loss)',
          'High Latency & Ping Timeouts (> 2000ms)',
          'Intermittent Packet Jitter / Dropouts',
          'MQTT Broker Disconnected'
        ],
        required: true
      },
      {
        key: 'affected_machines_count',
        label: 'Estimated Offline Machine Count',
        type: 'text',
        placeholder: 'e.g. 24 sewing machines (Entire Line 07)'
      }
    ],
    troubleshootingChecklist: [
      'Verified physical Ethernet RJ-45 link lights (Green/Amber LED) on the gateway port',
      'Confirmed the overhead line electrical power bus and PoE injector are energized',
      'Verified whether adjacent line gateways on the same floor are transmitting data',
      'Pressed the soft reboot switch or cycled AC breaker for the gateway circuit'
    ]
  },

  // 12. Specialized: Steam Boiler, Steam Iron & Compressor Pressure IoT
  {
    category: 'Steam Boiler, Steam Iron & Compressor Pressure IoT',
    badge: 'Steam / Pneumatics',
    description: 'Steam headers, vacuum lines, and air compressor pressure/temperature telemetry.',
    dynamicFields: [
      {
        key: 'equipment_tag',
        label: 'Target Boiler / Compressor Unit',
        type: 'text',
        placeholder: 'e.g. Boiler 01 - Main Steam Header, Atlas Copco GA-37',
        required: true
      },
      {
        key: 'physical_gauge_reading',
        label: 'Physical Analog Dial Gauge Reading',
        type: 'text',
        placeholder: 'e.g. 6.5 Bar, 8.0 Bar, 110 PSI',
        required: true,
        helpText: 'Read directly from the analog needle gauge on the pipe'
      },
      {
        key: 'telemetry_reading',
        label: 'IoT Dashboard Reading Value',
        type: 'text',
        placeholder: 'e.g. Reads 0.0 Bar, Frozen at 4.2 Bar, Spiking 0-14 Bar',
        required: true
      },
      {
        key: 'leakage_detected',
        label: 'Pneumatic / Steam Leakage Status',
        type: 'select',
        options: [
          'No Leakage Detected (Sealed)',
          'Audible Air / Steam Hissing Near Manifold',
          'Visible Condensation / Water Droplets',
          'Pressure Relief Valve Discharging'
        ]
      }
    ],
    troubleshootingChecklist: [
      'Cross-checked physical analog needle dial gauge with digital IoT telemetry value',
      'Confirmed the manual 1/4-turn isolation ball valve to the pressure sensor is fully open',
      'Inspected the 4-20mA pressure transmitter junction box for steam moisture or heat damage',
      'Verified compressor air dryer dewpoint and condensate auto-drain are functioning'
    ]
  },

  // 13. Specialized: RFID & Barcode Garment Bundle Tracking Terminal
  {
    category: 'RFID & Barcode Garment Bundle Tracking Terminal',
    badge: 'WIP / Bundle Tracking',
    description: 'Line bundle barcode guns, RFID scanners, and operator production logging terminals.',
    dynamicFields: [
      {
        key: 'terminal_id',
        label: 'Terminal / Tablet Station ID',
        type: 'text',
        placeholder: 'e.g. TRM-LINE-04-OP12, TABLET-QC-02',
        required: true
      },
      {
        key: 'scanner_type',
        label: 'Scanner Hardware Model',
        type: 'select',
        options: [
          'Bluetooth Handheld 2D Ring Scanner',
          'Corded USB 1D/2D Barcode Gun',
          'Fixed Mount RFID Bundle Tunnel',
          'NFC Tap Card Reader'
        ],
        required: true
      },
      {
        key: 'scan_error_type',
        label: 'Scanning Error Symptom',
        type: 'select',
        options: [
          'Laser / Aiming LED completely dead',
          'Scanner beeps but bundle data does not appear on screen',
          'Garment tracking tablet app crashes on scan',
          'Bluetooth scanner repeatedly disconnects'
        ],
        required: true
      }
    ],
    troubleshootingChecklist: [
      'Cleaned optical glass scanner exit window with dry lint-free cloth',
      'Tested scanning a known good master barcode calibration sheet',
      'Checked that the scanner battery is above 20% or USB plug is firmly seated',
      'Restarted the Garment Production Tracking tablet application'
    ]
  },

  // 14. Specialized: Fabric Spreading & CNC Cutting Machine IoT
  {
    category: 'Fabric Spreading & CNC Cutting Machine IoT',
    badge: 'Cutting Automation',
    description: 'Fabric spreaders, CNC automatic cutter vacuum beds, servo drivers, and knife vibration telemetry.',
    dynamicFields: [
      {
        key: 'cutter_asset_tag',
        label: 'Cutter / Spreader Asset Tag',
        type: 'text',
        placeholder: 'e.g. CNC-CUTTER-01, AUTO-SPREADER-A',
        required: true
      },
      {
        key: 'subsystem',
        label: 'Affected Machine Subsystem',
        type: 'select',
        options: [
          'Vacuum Hold-Down Table & Blower Motor',
          'Reciprocating Knife Drive & Vibration Head',
          'Automatic Sharpening Stone Assembly',
          'X/Y Gantry Servo Positioning System',
          'Fabric Conveyor Belt Feeder'
        ],
        required: true
      },
      {
        key: 'plc_alarm_code',
        label: 'PLC / CNC Controller Error Code',
        type: 'text',
        placeholder: 'e.g. ALARM 104 - SERVO OVERLOAD, VACUUM LOW 402',
        helpText: 'Displayed on the machine touchscreen operator panel'
      }
    ],
    troubleshootingChecklist: [
      'Inspected cutting table vacuum exhaust filter and cleared accumulated fabric fluff',
      'Confirmed all safety light curtains and emergency stop push-buttons are released',
      'Verified 3-phase industrial power supply voltage meters are balanced',
      'Checked CNC servo drive display for thermal warning or overcurrent trip'
    ]
  }
];

export const GARMENTS_SYSTEMS = [
  'Sewing Floor IoT Network (Lines 1-20)',
  'Main Fabric Cutting & Spreading Unit',
  'Central Steam Boiler & Pressing Header',
  'Compressed Air Pneumatics Line',
  'Garment Bundle Tracking & WIP RFID',
  'Finishing, Washing & Dyeing Plant',
  'Factory Electrical Substation & Energy SCADA',
  'Effluent Treatment Plant (ETP) Sensor Array',
  'Other / Custom Garment System'
];

export const GARMENTS_FLOORS = [
  'Building 1 - Ground Floor (Cutting & Spreading)',
  'Building 1 - 1st Floor (Sewing Lines 01 - 08)',
  'Building 1 - 2nd Floor (Sewing Lines 09 - 16)',
  'Building 1 - 3rd Floor (Finishing & Packing)',
  'Building 2 - Ground Floor (Steam Boiler & Compressors)',
  'Building 2 - 1st Floor (Embroidery & Printing)',
  'Building 2 - 2nd Floor (Washing & Dyeing Unit)',
  'Central Warehouse & Dispatch'
];

export const PRODUCTION_IMPACTS = [
  'No Production Loss (Telemetry monitoring warning only)',
  'Minor Slowdown (< 10% piece output impact)',
  'Moderate Disruption (10% - 30% line slowdown)',
  'Severe Bottleneck (> 50% line output stalled)',
  'Critical Line Stoppage (Entire line halted / workers idle)'
];
