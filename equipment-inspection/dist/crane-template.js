const CRANE_TEMPLATE = {
  "monthly": {
    "code": "QR18-05-C",
    "items": [
      {
        "id": 1,
        "name": {
          "zh": "過捲預防裝置",
          "en": "Overwind Prevention Device",
          "es": "Dispositivo de prevención de  retorcer",
          "vi": "Thiết bị chống cuốn quá mức"
        },
        "standard": {
          "zh": "具有自動遮斷動力及制動之機能，作動安全距離符合規定",
          "en": "It has the function of automatically shutting off power and braking, and the operating safety distance complies with regulations.",
          "es": "Corta automáticamente la energía y frena; la distancia de seguridad de actuación cumple los requisitos.",
          "vi": "Tự động ngắt nguồn và phanh; khoảng cách an toàn khi tác động đáp ứng quy định."
        }
      },
      {
        "id": 2,
        "name": {
          "zh": "過負荷預防裝置",
          "en": "Overload Prevention Device",
          "es": "Dispositivo de prevención de sobrecarga",
          "vi": "Thiết bị chống quá tải"
        },
        "standard": {
          "zh": "當過負荷時具有自動遮斷動力機能",
          "en": "Automatically cut off power when overloaded",
          "es": "Corta automáticamente la energía cuando hay sobrecarga.",
          "vi": "Tự động ngắt nguồn khi quá tải."
        }
      },
      {
        "id": 3,
        "name": {
          "zh": "防止逸走裝置",
          "en": "Anti-Derailing Device",
          "es": "Dispositivo antideslizamiento",
          "vi": "Thiết bị chống trôi"
        },
        "standard": {
          "zh": "無損傷、變形，應具有將機具確實固定之機能",
          "en": "No damage or deformation, and should be able to firmly fix the machine",
          "es": "Sin daños ni deformaciones; fija firmemente la máquina.",
          "vi": "Không hư hỏng hoặc biến dạng; có khả năng cố định chắc chắn thiết bị."
        }
      },
      {
        "id": 4,
        "name": {
          "zh": "阻擋器、緩衝裝置",
          "en": "Stopper and Buffer Device",
          "es": "Dispositivo de tope y amortiguador",
          "vi": "Bộ chặn và bộ giảm chấn"
        },
        "standard": {
          "zh": "無損傷、歪斜、脫落，機能正常",
          "en": "No damage, skewness, or falling off, and functions normally",
          "es": "Sin daños, inclinación ni desprendimiento; funcionamiento normal.",
          "vi": "Không hư hỏng, lệch hoặc rơi ra; hoạt động bình thường."
        }
      },
      {
        "id": 5,
        "name": {
          "zh": "制動器",
          "en": "Brake",
          "es": "Freno",
          "vi": "Phanh"
        },
        "standard": {
          "zh": "剎車動作狀況圓滑",
          "en": "Braking action is smooth",
          "es": "El frenado es suave.",
          "vi": "Phanh hoạt động êm."
        }
      },
      {
        "id": 6,
        "name": {
          "zh": "制動器",
          "en": "Brake",
          "es": "Freno",
          "vi": "Phanh"
        },
        "standard": {
          "zh": "無顯著磨損、剝離、油污",
          "en": "No significant wear, peeling, or oil stains",
          "es": "Sin desgaste significativo, desprendimientos ni manchas de aceite.",
          "vi": "Không mài mòn đáng kể, bong tróc hoặc dính dầu."
        }
      },
      {
        "id": 7,
        "name": {
          "zh": "鋼索",
          "en": "Wire Rope",
          "es": "Cable de acero",
          "vi": "Cáp thép"
        },
        "standard": {
          "zh": "直徑磨損未超過公稱直徑之7％\n10mm 公稱直徑磨損容許值 9.3mm，實測值請填入下方欄位\n12mm 公稱直徑磨損容許值 11.16mm，實測值請填入下方欄位",
          "en": "The diameter wear does not exceed 7% of the nominal diameter.\n10mm nominal size: permissible diameter wear value 9.3mm; enter the measured value below.\n12mm nominal size: permissible diameter wear value 11.16mm; enter the measured value below.",
          "es": "La reducción del diámetro por desgaste no supera el 7 % del diámetro nominal.\nTamaño nominal de 10 mm: valor permitido 9,3 mm; introduzca la medida abajo.\nTamaño nominal de 12 mm: valor permitido 11,16 mm; introduzca la medida abajo.",
          "vi": "Đường kính bị mòn không vượt quá 7% đường kính danh nghĩa.\nKích thước danh nghĩa 10 mm: giá trị cho phép 9,3 mm; nhập số đo bên dưới.\nKích thước danh nghĩa 12 mm: giá trị cho phép 11,16 mm; nhập số đo bên dưới."
        }
      },
      {
        "id": 8,
        "name": {
          "zh": "鋼索",
          "en": "Wire Rope",
          "es": "Cable de acero",
          "vi": "Cáp thép"
        },
        "standard": {
          "zh": "一撚間素線斷裂未超過10％",
          "en": "The line breaks not more than 10%.",
          "es": "Los alambres rotos en un paso de cable no superan el 10 %.",
          "vi": "Số sợi đứt trong một bước bện không vượt quá 10%."
        }
      },
      {
        "id": 9,
        "name": {
          "zh": "鋼索",
          "en": "Wire Rope",
          "es": "Cable de acero",
          "vi": "Cáp thép"
        },
        "standard": {
          "zh": "無扭結、顯著變形、腐蝕",
          "en": "No kinks, significant deformation, corrosion",
          "es": "Sin cocas, deformación significativa ni corrosión.",
          "vi": "Không xoắn gập, biến dạng đáng kể hoặc ăn mòn."
        }
      },
      {
        "id": 10,
        "name": {
          "zh": "鋼索",
          "en": "Wire Rope",
          "es": "Cable de acero",
          "vi": "Cáp thép"
        },
        "standard": {
          "zh": "尾端固定正確具防鬆或自緊性能",
          "en": "The tail end is fixed correctly with anti-loosening or self-tightening performance",
          "es": "El extremo está fijado correctamente con función antiaflojamiento o autobloqueo.",
          "vi": "Đầu cáp được cố định đúng, có khả năng chống lỏng hoặc tự siết."
        }
      },
      {
        "id": 11,
        "name": {
          "zh": "吊鏈",
          "en": "Hoist Chain",
          "es": "Cadena de elevación",
          "vi": "Xích nâng"
        },
        "standard": {
          "zh": "斷面直徑減少未超過10％",
          "en": "The cross-sectional diameter does not decrease by more than 10%",
          "es": "La reducción del diámetro de la sección no supera el 10 %.",
          "vi": "Đường kính tiết diện giảm không quá 10%."
        }
      },
      {
        "id": 12,
        "name": {
          "zh": "吊鏈",
          "en": "Hoist Chain",
          "es": "Cadena de elevación",
          "vi": "Xích nâng"
        },
        "standard": {
          "zh": "伸長率未超過5％",
          "en": "Elongation does not exceed 5%",
          "es": "El alargamiento no supera el 5 %.",
          "vi": "Độ giãn dài không vượt quá 5%."
        }
      },
      {
        "id": 13,
        "name": {
          "zh": "吊鏈",
          "en": "Hoist Chain",
          "es": "Cadena de elevación",
          "vi": "Xích nâng"
        },
        "standard": {
          "zh": "無龜裂、腐蝕",
          "en": "No cracking or corrosion",
          "es": "Sin grietas ni corrosión.",
          "vi": "Không nứt hoặc ăn mòn."
        }
      },
      {
        "id": 14,
        "name": {
          "zh": "吊鉤",
          "en": "Hook",
          "es": "Gancho",
          "vi": "Móc cẩu"
        },
        "standard": {
          "zh": "吊鉤應鍛造成形，能自由圓滑轉動，並不得龜裂或明顯之銹蝕等有之缺陷，且未焊補、電鍍等改造。",
          "en": "The hook should be forged and able to rotate smoothly and freely, and should not have defects such as cracks or obvious rust, and should not be modified by welding, electroplating, etc.",
          "es": "El gancho está forjado, gira libre y suavemente, no tiene grietas ni corrosión evidente y no ha sido modificado mediante soldadura, galvanizado u otros procesos.",
          "vi": "Móc phải được rèn, quay tự do và êm, không nứt hoặc gỉ rõ rệt; không được sửa đổi bằng hàn đắp, mạ điện hoặc phương pháp tương tự."
        }
      },
      {
        "id": 15,
        "name": {
          "zh": "吊鉤",
          "en": "Hook",
          "es": "Gancho",
          "vi": "Móc cẩu"
        },
        "standard": {
          "zh": "吊鉤槽輪組之鍵板、鎖緊銷、止動螺栓、開口銷等無脫落、鬆動或損傷影響安全動作。",
          "en": "The key plate, locking pin, stop bolt, cotter pin, etc. of the hook sheave assembly must not fall off, become loose or be damaged, which may affect safe operation.",
          "es": "Las placas de chaveta, pasadores de bloqueo, pernos de tope y pasadores hendidos del conjunto de poleas del gancho no están sueltos, desprendidos ni dañados de forma que afecten la seguridad.",
          "vi": "Tấm chặn, chốt khóa, bu lông chặn, chốt chẻ của cụm puly móc không bị rơi, lỏng hoặc hư hỏng ảnh hưởng đến vận hành an toàn."
        }
      },
      {
        "id": 16,
        "name": {
          "zh": "吊鉤",
          "en": "Hook",
          "es": "Gancho",
          "vi": "Móc cẩu"
        },
        "standard": {
          "zh": "吊鉤開口寬度未超過原標示尺寸5%。與吊具接觸部分磨損量無超過製造廠之規定值者。(無規定值時，其磨損量不得超過原尺寸之5%)(單位:mm)",
          "en": "The width of the hook opening does not exceed the original marked size by 5%. The wear of the part in contact with the sling does not exceed the value specified by the manufacturer. (If there is no specified value, the wear shall not exceed 5% of the original size)",
          "es": "La abertura del gancho no excede en un 5 % la medida original. El desgaste en contacto con el aparejo no supera el límite del fabricante; si no se especifica, no supera el 5 % de la medida original (mm).",
          "vi": "Độ mở móc không vượt quá kích thước ban đầu 5%. Độ mòn tại phần tiếp xúc với phụ kiện nâng không vượt quá giới hạn của nhà sản xuất; nếu không có giới hạn, không vượt quá 5% kích thước ban đầu (mm)."
        }
      },
      {
        "id": 17,
        "name": {
          "zh": "吊鉤",
          "en": "Hook",
          "es": "Gancho",
          "vi": "Móc cẩu"
        },
        "standard": {
          "zh": "吊鉤應設有防止吊掛用鋼索等自該吊鉤脫落之裝置且作用良好。",
          "en": "The hook should be equipped with a device to prevent the hanging wire rope etc. from falling off the hook and the device should function well.",
          "es": "El gancho tiene un dispositivo que impide que el cable de suspensión se desprenda y este funciona correctamente.",
          "vi": "Móc có thiết bị ngăn cáp treo tuột khỏi móc và thiết bị hoạt động tốt."
        }
      },
      {
        "id": 18,
        "name": {
          "zh": "吊具",
          "en": "Lifting Gear",
          "es": "Equipo de elevación",
          "vi": "Phụ kiện nâng"
        },
        "standard": {
          "zh": "無顯著之變形、裂痕。",
          "en": "No significant deformation or cracks.",
          "es": "Sin deformación significativa ni grietas.",
          "vi": "Không biến dạng đáng kể hoặc nứt."
        }
      },
      {
        "id": 19,
        "name": {
          "zh": "供電線、配線",
          "en": "Power Cable and Wiring",
          "es": "Cable de alimentación y cableado",
          "vi": "Dây nguồn và hệ thống dây điện"
        },
        "standard": {
          "zh": "絕緣被覆無損傷或老化、無過度張開、扭結、固定夾鬆弛現象",
          "en": "The insulation coating is not damaged or aged, and there is no excessive opening, kinking, or loosening of the fixing clips.",
          "es": "El aislamiento no está dañado ni envejecido; sin separación excesiva, cocas ni abrazaderas flojas.",
          "vi": "Lớp cách điện không hư hỏng hoặc lão hóa; không bị mở quá mức, xoắn gập hoặc lỏng kẹp cố định."
        }
      },
      {
        "id": 20,
        "name": {
          "zh": "集電裝置",
          "en": "Power Collector Device",
          "es": "Dispositivo colector de energía",
          "vi": "Bộ thu điện"
        },
        "standard": {
          "zh": "應能正常給電，無接觸不良、絕緣物損傷之現象",
          "en": "It should be able to supply power normally without any poor contact or insulation damage.",
          "es": "Suministra energía normalmente, sin mal contacto ni daños en el aislamiento.",
          "vi": "Cấp điện bình thường, không tiếp xúc kém hoặc hư hỏng cách điện."
        }
      },
      {
        "id": 21,
        "name": {
          "zh": "配電盤",
          "en": "Distribution Panel",
          "es": "Panel de distribución",
          "vi": "Tủ điện"
        },
        "standard": {
          "zh": "檢查配線接頭確實接牢、遮斷器之開關、閘刀開關、電磁接觸器等機能無異常",
          "en": "Check that the wiring connectors are firmly connected, and that there are no abnormalities in the functions of the circuit breaker, knife switch, electromagnetic contactor, etc.",
          "es": "Las conexiones están firmes; los interruptores automáticos, seccionadores de cuchilla y contactores electromagnéticos funcionan sin anomalías.",
          "vi": "Các đầu nối dây chắc chắn; bộ ngắt mạch, cầu dao và công tắc tơ điện từ hoạt động không bất thường."
        }
      },
      {
        "id": 22,
        "name": {
          "zh": "操作開關",
          "en": "Control Switch",
          "es": "Interruptor de control",
          "vi": "Công tắc điều khiển"
        },
        "standard": {
          "zh": "操作開關或控制器作動狀況正常，作動方向正確",
          "en": "The operating switch or controller is operating normally and the operating direction is correct.",
          "es": "Los interruptores o controladores funcionan normalmente y en la dirección correcta.",
          "vi": "Công tắc hoặc bộ điều khiển hoạt động bình thường, hướng hoạt động chính xác."
        }
      }
    ],
    "hazards": [
      {
        "zh": "檢查發現危害、分析危害因素",
        "en": "Identify Hazards and Analyze Risk Factors",
        "es": "Identificación de peligros y análisis de factores de riesgo",
        "vi": "Phát hiện nguy cơ và phân tích yếu tố nguy hiểm"
      },
      {
        "zh": "評估危害風險(嚴重性及可能性分析)",
        "en": "Hazard Risk Assessment (Severity and Probability Analysis)",
        "es": "Evaluación del riesgo (gravedad y probabilidad)",
        "vi": "Đánh giá rủi ro (mức độ nghiêm trọng và khả năng xảy ra)"
      },
      {
        "zh": "評估結果改善措施",
        "en": "Evaluation Results and Improvement Measures",
        "es": "Resultados de evaluación y medidas de mejora",
        "vi": "Kết quả đánh giá và biện pháp cải thiện"
      },
      {
        "zh": "檢討改善措施之合宜性",
        "en": "Review of Improvement Measures Appropriateness",
        "es": "Revisión de la adecuación de las medidas de mejora",
        "vi": "Xem xét tính phù hợp của biện pháp cải thiện"
      }
    ],
    "notes": "備註 Remark / Observación：\n依「勞工安全衛生組織及自動檢查」第17、80條規定辦理，每月定期檢查一次，記錄保存三年。\nConducted according to Articles 17 and 80 of the \"Labor Safety and Health Organization and Self-Inspection\" regulations, inspected monthly, with records kept for three years.\nRealizado conforme a los artículos 17 y 80 de las regulaciones de \"Organización de Seguridad y Salud Laboral y Autoinspección\", inspección mensual, con registros conservados durante tres años.\n\n檢查結果欄：應包括發現危害、分析危害因素：X為嚴重性危害； Δ 可能性危害； ✔ 為無危害；─ 為無此項目。\nInspection Results Column: Should include identified hazards and analysis of hazard factors: X for severe hazard; Δ for potential hazard; ✔ for no hazard; ─ for no item.\nColumna de resultados de inspección: Debe incluir peligros identificados y análisis de factores de riesgo: X para peligro severo; Δ para peligro potencial; ✔ para sin peligro; ─ para sin ítem.\n\n評估危害風險欄：請區分嚴重性及可能性分析\nHazard Risk Assessment Column: Please differentiate between severity and probability analysis\nColumna de evaluación de riesgo de peligro: Distinga entre análisis de severidad y probabilidad\n\n4..檢查結果若發現有危害之異常時，申請維修處理。\nIf any hazards are detected during the inspection, request maintenance.\nSi se detecta alguna anomalía de peligro durante la inspección, solicite mantenimiento"
  },
  "daily": {
    "code": "HR07-10-A",
    "items": [
      {
        "id": 1,
        "name": {
          "zh": "造捲預防裝置是否正常",
          "en": "Does the overwind prevention device function normally?",
          "es": "¿Funciona correctamente el dispositivo contra sobreenrollamiento?",
          "vi": "Thiết bị chống cuốn quá mức có hoạt động bình thường không?"
        }
      },
      {
        "id": 2,
        "name": {
          "zh": "煞車器、離合器是否正常",
          "en": "Do the brakes and clutch function normally?",
          "es": "¿Funcionan correctamente los frenos y el embrague?",
          "vi": "Phanh và ly hợp có hoạt động bình thường không?"
        }
      },
      {
        "id": 3,
        "name": {
          "zh": "控制裝置之性能是否正常",
          "en": "Do the control devices function normally?",
          "es": "¿Funcionan correctamente los dispositivos de control?",
          "vi": "Các thiết bị điều khiển có hoạt động bình thường không?"
        }
      },
      {
        "id": 4,
        "name": {
          "zh": "架軌上及吊運車橫行之導軌狀況是否正常",
          "en": "Are the crane rails and trolley traverse guide rails in normal condition?",
          "es": "¿Están en buen estado los rieles de la grúa y las guías transversales del carro?",
          "vi": "Ray cầu trục và ray di chuyển ngang của xe con có ở tình trạng bình thường không?"
        }
      },
      {
        "id": 5,
        "name": {
          "zh": "鋼纜運行狀況是否正常",
          "en": "Does the wire rope run normally?",
          "es": "¿Funciona normalmente el cable de acero?",
          "vi": "Cáp thép có vận hành bình thường không?"
        }
      },
      {
        "id": 6,
        "name": {
          "zh": "其他",
          "en": "Other",
          "es": "Otros",
          "vi": "Khác"
        }
      }
    ],
    "notes": "檢點檢查結果正常打(ˇ)異常打(×)，本表主管課室自存月底再送安全衛生管理課存查。\n如遇瞬間風速超過30M/S或四級以上地震，應另再檢點安全狀況、拆裝、檢修、調整應指定作業監督人員。"
  }
};
