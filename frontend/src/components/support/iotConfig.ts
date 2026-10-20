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
        helpText: 'Labeled on the top of the industrial DIN-rail gateway enclosure'
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
  },
  {
    category: 'Software / Firmware / Analytics Dashboard Issue',
    badge: 'Software / Cloud',
    description: 'Garment floor efficiency metrics, piece-rate calculation, line balancing charts, and cloud sync.',
    dynamicFields: [
      {
        key: 'app_version',
        label: 'Software / Dashboard Version',
        type: 'text',
        placeholder: 'e.g. v3.2.0-iot, Build #20261014'
      },
      {
        key: 'device_browser',
        label: 'Operating Environment',
        type: 'text',
        placeholder: 'e.g. Chrome on Industrial Tablet, Control Room PC'
      },
      {
        key: 'data_anomaly',
        label: 'Observed Telemetry Bug',
        type: 'select',
        options: [
          'Line Efficiency Chart Frozen / Not Updating',
          'Operator Piece Count Not Incrementing',
          'Unrealistic Telemetry Spikes (99999 or NaN)',
          'Data Synchronization Lag Exceeds 30 Minutes'
        ],
        required: true
      }
    ],
    troubleshootingChecklist: [
      'Performed hard browser reload (Ctrl + Shift + R) to refresh cached frontend assets',
      'Verified the API Health status icon in top bar indicates "Online" (Green)',
      'Tested accessing the dashboard from another supervisor terminal or mobile device',
      'Confirmed the active operator has valid supervisor permissions assigned'
    ]
  },
  {
    category: 'Other / General Factory IoT Issue',
    badge: 'General IoT',
    description: 'Custom IoT telemetry, auxiliary factory sensors, energy meters, and general requests.',
    dynamicFields: [
      {
        key: 'device_identifier',
        label: 'Equipment or Sensor Identifier',
        type: 'text',
        placeholder: 'e.g. ENERGY-METER-PANEL-3, TEMP-SENSOR-01',
        required: true
      },
      {
        key: 'symptoms',
        label: 'Primary Symptom Observed',
        type: 'text',
        placeholder: 'Describe observed symptoms, error sounds, or anomalous readings'
      }
    ],
    troubleshootingChecklist: [
      'Verified physical wiring and power cable connections are tight and undamaged',
      'Checked power supply voltage with a calibrated digital multimeter',
      'Executed a clean 15-second power reboot on the affected equipment'
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
