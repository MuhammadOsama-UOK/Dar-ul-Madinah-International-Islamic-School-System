const fs = require('fs');

const raw = `
% ==========================================
% CLASS IV MARKSHEET
% ==========================================
\\section*{Class IV (Matric)}
\\begin{longtable}{|c|c|p{6.5cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|}
\\hline
\\textbf{S.No} & \\textbf{GR No} & \\textbf{Student Name / Father Name} & \\textbf{Eng} & \\textbf{Isl} & \\textbf{Sin} & \\textbf{Urd} & \\textbf{Mat} & \\textbf{ICT} & \\textbf{Sci} & \\textbf{S.ST} & \\textbf{Total} & \\textbf{\\%age} \\\\ \\hline
\\endhead
1 & 128 & \\textbf{MUHAMMAD AHMED} \\newline \\small MUHAMMAD ATIQUE & & & & & & & & & & \\\\ \\hline
2 & 223 & \\textbf{MOHAMMAD IBRAHEEM SIDDIQUI} \\newline \\small TAHIR HUSAIN SIDDIQUI & & & & & & & & & & \\\\ \\hline
3 & 284 & \\textbf{ZAM ZAM RAZA} \\newline \\small MUHAMMAD NADEEM & & & & & & & & & & \\\\ \\hline
4 & 445 & \\textbf{MOHAMMAD HASSAN} \\newline \\small MOHAMMAD SHAKIR & & & & & & & & & & \\\\ \\hline
5 & 514 & \\textbf{MUHAMMAD ZAID} \\newline \\small ZEESHAN AHMED & & & & & & & & & & \\\\ \\hline
6 & 579 & \\textbf{MUHAMMAD HASSAN RAZA} \\newline \\small ASIF ALI & & & & & & & & & & \\\\ \\hline
7 & 585 & \\textbf{MUHAMMAD AHMED} \\newline \\small MUHAMMAD NOMAN & & & & & & & & & & \\\\ \\hline
8 & 999 & \\textbf{SYED MUHAMMAD ROHAN NAQVI SM DANISH} \\newline \\small SYED MUHAMMADC DANISH & & & & & & & & & & \\\\ \\hline
9 & 1939 & \\textbf{MUHAMMAD BILAL RAHEEL} \\newline \\small MUHAMMAD RAHEEL & & & & & & & & & & \\\\ \\hline
10 & 1940 & \\textbf{AHMED HUSSAIN} \\newline \\small ZAFAR HUSSAIN & & & & & & & & & & \\\\ \\hline
\\end{longtable}

\\newpage
% ==========================================
% CLASS V MARKSHEET
% ==========================================
\\section*{Class V (Matric)}
\\begin{longtable}{|c|c|p{6.5cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|}
\\hline
\\textbf{S.No} & \\textbf{GR No} & \\textbf{Student Name / Father Name} & \\textbf{ICT} & \\textbf{Urd} & \\textbf{Sci} & \\textbf{Mat} & \\textbf{S.ST} & \\textbf{Eng} & \\textbf{Isl} & \\textbf{Sin} & \\textbf{Total} & \\textbf{\\%age} \\\\ \\hline
\\endhead
1 & 1299 & \\textbf{MUHAMMAD ZAVIYAR KHAN} \\newline \\small FEROZ KHAN & & & & & & & & & & \\\\ \\hline
2 & 1303 & \\textbf{MUHAMMAD ALI MUHAMMAD NAZIM} \\newline \\small NAZIM & & & & & & & & & & \\\\ \\hline
3 & 445 & \\textbf{HUSNAIN RAZA} \\newline \\small UMAIR & & & & & & & & & & \\\\ \\hline
4 & 447 & \\textbf{AHMED RAZA} \\newline \\small MUHAMMAD BILAL RAZA & & & & & & & & & & \\\\ \\hline
5 & 1319 & \\textbf{MUHAMMAD ANAS} \\newline \\small MUHAMMAD ASHRAF & & & & & & & & & & \\\\ \\hline
6 & 1418 & \\textbf{MUHAMMAD MUSAB} \\newline \\small TAYYAB MUSHTAQ & & & & & & & & & & \\\\ \\hline
7 & 452 & \\textbf{MUHAMMAD YOUSUF} \\newline \\small MUHAMMAD MOBIN & & & & & & & & & & \\\\ \\hline
8 & 1471 & \\textbf{FARZAM} \\newline \\small FURQAN & & & & & & & & & & \\\\ \\hline
9 & 1465 & \\textbf{MUHAMMAD HUSNAIN KHAN} \\newline \\small MUHAMMAD NADEEM KHAN & & & & & & & & & & \\\\ \\hline
10 & 1508 & \\textbf{MUHAMMAD HASNAIN LAKHANI} \\newline \\small FAISAL ZAKARIA LAKHANI & & & & & & & & & & \\\\ \\hline
11 & 577 & \\textbf{ABDUL SHAKOOR} \\newline \\small MUHAMMAD AMJAD & & & & & & & & & & \\\\ \\hline
12 & 1532 & \\textbf{MUAZ RAZA} \\newline \\small SHAHZAD AHMED & & & & & & & & & & \\\\ \\hline
13 & 1688 & \\textbf{ROHAAN SALEEM} \\newline \\small MUHAMMAD SALEEM & & & & & & & & & & \\\\ \\hline
14 & 739 & \\textbf{MUHAMMAD SALEH} \\newline \\small MUHAMMAD FASAL RASHEED & & & & & & & & & & \\\\ \\hline
15 & 2023 & \\textbf{MOHAMMAD AREESH LAKHANI} \\newline \\small MOHAMMAD SULEMAN BILAL LAKHANI & & & & & & & & & & \\\\ \\hline
16 & 914 & \\textbf{MUHAMMAD UBAID LAKHANI} \\newline \\small MUHAMMAD ARSALAN LAKHANI & & & & & & & & & & \\\\ \\hline
17 & 1031 & \\textbf{SYED USMAN HAIDER} \\newline \\small SYED HAIDER AZAM & & & & & & & & & & \\\\ \\hline
18 & 1061 & \\textbf{SYED ESHAREB ALI SYED REHMAN} \\newline \\small SYED REHMAN ALI & & & & & & & & & & \\\\ \\hline
19 & 1925 & \\textbf{ABDUL HADI} \\newline \\small MUHAMMAD KASHIF & & & & & & & & & & \\\\ \\hline
20 & 1926 & \\textbf{HAMDAN} \\newline \\small ADNAN AHMED & & & & & & & & & & \\\\ \\hline
21 & 1927 & \\textbf{AHMED RAZA KHAN} \\newline \\small MUHAMMAD BABAR KHAN & & & & & & & & & & \\\\ \\hline
\\end{longtable}

\\newpage
% ==========================================
% CLASS VI MARKSHEET
% ==========================================
\\section*{Class VI (Matric)}
\\begin{longtable}{|c|c|p{6.5cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|}
\\hline
\\textbf{S.No} & \\textbf{GR No} & \\textbf{Student Name / Father Name} & \\textbf{Isl} & \\textbf{Urd} & \\textbf{S.ST} & \\textbf{Sin} & \\textbf{Sci} & \\textbf{Mat} & \\textbf{ICT} & \\textbf{Eng} & \\textbf{Total} & \\textbf{\\%age} \\\\ \\hline
\\endhead
1 & 1057 & \\textbf{MOHAMMAD ALI ABBAS} \\newline \\small HADI & & & & & & & & & & \\\\ \\hline
2 & 1047 & \\textbf{ABDUL HADI} \\newline \\small MUHAMMAD DILSHAD & & & & & & & & & & \\\\ \\hline
3 & 1058 & \\textbf{MUHAMMAD BILAL HINGORJA} \\newline \\small SADDAM HUSSAIN & & & & & & & & & & \\\\ \\hline
4 & 1097 & \\textbf{MUHAMMAD HUSSAIN KHAN} \\newline \\small BILAL HUSSAIN KHAN & & & & & & & & & & \\\\ \\hline
5 & 949 & \\textbf{MUHAMMAD OWAIS ALI} \\newline \\small MUHAMMAD BILAL & & & & & & & & & & \\\\ \\hline
6 & 1338 & \\textbf{MUHAMMAD MUSAB ATTIB BUTT} \\newline \\small ATTIB ULLAH BUTT & & & & & & & & & & \\\\ \\hline
7 & 1350 & \\textbf{MUHAMMAD AYAN} \\newline \\small MUHAMMAD IRFAN & & & & & & & & & & \\\\ \\hline
8 & 1574 & \\textbf{MUHAMMAD HABIB} \\newline \\small MUHAMMAD ALI & & & & & & & & & & \\\\ \\hline
9 & 957 & \\textbf{MUHAMMAD MUSTAFA ELAHI ATTARI} \\newline \\small IMRAN ELAHI & & & & & & & & & & \\\\ \\hline
10 & 1374 & \\textbf{MADANI RAZA} \\newline \\small ABDUL REHMAN & & & & & & & & & & \\\\ \\hline
11 & 1384 & \\textbf{MUHAMMAD NAJEEB RAZA} \\newline \\small MUSTAFA NOORANI & & & & & & & & & & \\\\ \\hline
12 & 925 & \\textbf{AMEER HAMZA NAREJO} \\newline \\small MUHAMMAD IMTIAZ NAREJO & & & & & & & & & & \\\\ \\hline
13 & 1877 & \\textbf{MUHAMMAD AFZAL} \\newline \\small ABID & & & & & & & & & & \\\\ \\hline
14 & 1286 & \\textbf{ABDUL GHAFOOR} \\newline \\small USMAN & & & & & & & & & & \\\\ \\hline
15 & 1293 & \\textbf{MUHAMMAD SALMAN} \\newline \\small MUHAMMAD ALTAF & & & & & & & & & & \\\\ \\hline
16 & 1134 & \\textbf{MOHAMMAD ABDULLAH QURESHI} \\newline \\small MOHAMMAD WASEEM QURESHI & & & & & & & & & & \\\\ \\hline
17 & 1541 & \\textbf{MUHAMMAD SHAHEER RAZA KHAN QADRI} \\newline \\small BEHZAD AHMED & & & & & & & & & & \\\\ \\hline
18 & 1542 & \\textbf{MADNI RAZA} \\newline \\small MUHAMMAD AMIR & & & & & & & & & & \\\\ \\hline
19 & 1045 & \\textbf{SYED GHULAM HASAN} \\newline \\small SYED DILSHAD MURTAZA & & & & & & & & & & \\\\ \\hline
20 & 1581 & \\textbf{MUHAMMAD ZAIN-UL-ABIDIN} \\newline \\small AQEEL NAWAZ & & & & & & & & & & \\\\ \\hline
21 & 1582 & \\textbf{MUHAMMAD UMAR} \\newline \\small JAWAD UL HAQ & & & & & & & & & & \\\\ \\hline
22 & 1585 & \\textbf{HANZALA RAZA} \\newline \\small HUMAIR & & & & & & & & & & \\\\ \\hline
23 & 1714 & \\textbf{MUHAMMAD HAMZA} \\newline \\small MUHAMMAD FAISAL & & & & & & & & & & \\\\ \\hline
24 & 1176 & \\textbf{MUHAMMAD BILAL HUSSAIN} \\newline \\small MUHAMMAD RASHID & & & & & & & & & & \\\\ \\hline
25 & 1548 & \\textbf{MEELAD RAZA} \\newline \\small MUHAMMAD AMIR & & & & & & & & & & \\\\ \\hline
26 & 1607 & \\textbf{MUHAMMAD ARHAM} \\newline \\small MUHAMMAD SHAKIL QAISAR & & & & & & & & & & \\\\ \\hline
27 & 1046 & \\textbf{MUHAMMAD} \\newline \\small MUHAMMAD FAHEEM & & & & & & & & & & \\\\ \\hline
28 & 1928 & \\textbf{MUHAMMAD AHMED} \\newline \\small MUHAMMAD FAISAL & & & & & & & & & & \\\\ \\hline
29 & 1929 & \\textbf{MUHAMMAD HASSAN RAZA} \\newline \\small MUHAMMAD FAISAL & & & & & & & & & & \\\\ \\hline
30 & 1930 & \\textbf{HAFIZ HAMZA} \\newline \\small MUZAMMIL & & & & & & & & & & \\\\ \\hline
31 & 1931 & \\textbf{SYED MUHAMMAD ZAEEM ALI} \\newline \\small SYED RASHID ALI NAQVI & & & & & & & & & & \\\\ \\hline
32 & 1932 & \\textbf{ABDUL AHAD MAMDANI} \\newline \\small MUHAMMAD IMRAN MAMDANI & & & & & & & & & & \\\\ \\hline
33 & 1933 & \\textbf{MUHAMMAD ISMAIL} \\newline \\small MUHAMAD KHAVEED & & & & & & & & & & \\\\ \\hline
34 & 1934 & \\textbf{MUHAMMAD HASSAN RAZA} \\newline \\small ZEESHAN SIDDIQUI & & & & & & & & & & \\\\ \\hline
\\end{longtable}

\\newpage
% ==========================================
% CLASS VII MARKSHEET
% ==========================================
\\section*{Class VII (Matric)}
\\begin{longtable}{|c|c|p{6.5cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|}
\\hline
\\textbf{S.No} & \\textbf{GR No} & \\textbf{Student Name / Father Name} & \\textbf{Eng} & \\textbf{Sin} & \\textbf{Sci} & \\textbf{Urd} & \\textbf{ICT} & \\textbf{Mat} & \\textbf{S.ST} & \\textbf{Isl} & \\textbf{Total} & \\textbf{\\%age} \\\\ \\hline
\\endhead
1 & 998 & \\textbf{MUHAMMAD HASSAAN RAZA} \\newline \\small ZAIN UL ABIDIN & & & & & & & & & & \\\\ \\hline
2 & 996 & \\textbf{SYED M AALLIYAN SHAH} \\newline \\small SYED UBAID ULLAH SHAH & & & & & & & & & & \\\\ \\hline
3 & 1016 & \\textbf{SYED MUHAMMAD RAJAB RAZA} \\newline \\small SYED SAJID ALI & & & & & & & & & & \\\\ \\hline
4 & 21 & \\textbf{MUHAMMAD FOUZAIL SHAIKH} \\newline \\small MUHAMMAD BILAL & & & & & & & & & & \\\\ \\hline
5 & 22 & \\textbf{SYED MUHAMMAD SAAD} \\newline \\small SYED HUMAYON HASHMI & & & & & & & & & & \\\\ \\hline
6 & 1147 & \\textbf{MUHAMMAD HUZAIFA QADRI} \\newline \\small NOMAN MOTIWALA & & & & & & & & & & \\\\ \\hline
7 & 27 & \\textbf{MUHAMMAD ASHARIB} \\newline \\small MUHAMMAD ADNAN & & & & & & & & & & \\\\ \\hline
8 & 501 & \\textbf{MUHAMMAD HAMZA ALI} \\newline \\small MUHAMMAD ALI QADRI & & & & & & & & & & \\\\ \\hline
9 & 1110 & \\textbf{MUHAMMAD ZAIN HUSSAIN} \\newline \\small INAM UL HAQ & & & & & & & & & & \\\\ \\hline
10 & 29 & \\textbf{RAQEEB AHMED} \\newline \\small RASHEED AHMED & & & & & & & & & & \\\\ \\hline
11 & 30 & \\textbf{NOOR MUSTAFA HULLIO} \\newline \\small MUHAMMAD ALI HULLIO & & & & & & & & & & \\\\ \\hline
12 & 1393 & \\textbf{MUHAMMAD ARHAM} \\newline \\small MUHAMMAD ASHFAQ & & & & & & & & & & \\\\ \\hline
13 & 1272 & \\textbf{SYED MEHMOOD ALI} \\newline \\small SYED JAWAD ALI & & & & & & & & & & \\\\ \\hline
14 & 33 & \\textbf{AHMAD RAZA} \\newline \\small SHAKIR & & & & & & & & & & \\\\ \\hline
15 & 1270 & \\textbf{ABDUL HADI AHMED} \\newline \\small FAROOQ AHMED & & & & & & & & & & \\\\ \\hline
16 & 34 & \\textbf{MUHAMMAD SHAYAN E ALI NAWAZ} \\newline \\small AQEEL NAWAZ & & & & & & & & & & \\\\ \\hline
17 & 38 & \\textbf{MUHAMMAD FARZAAN AHMED SIDDIQUI} \\newline \\small MUKHTAR MOHSIN AHMED & & & & & & & & & & \\\\ \\hline
18 & 41 & \\textbf{MUHAMMAD HASSAN RAZA} \\newline \\small ABDUL MAJEED & & & & & & & & & & \\\\ \\hline
19 & 1835 & \\textbf{MUHAMMAD MUBASHIR HUSSAIN} \\newline \\small MAIRAJ MUHAMMAD & & & & & & & & & & \\\\ \\hline
20 & 1915 & \\textbf{SYED MUHAMMAD FAIQ ALI} \\newline \\small SYED ASIF ALI & & & & & & & & & & \\\\ \\hline
21 & 1890 & \\textbf{ANAS NADEEM} \\newline \\small NADEEM HUSSAIN & & & & & & & & & & \\\\ \\hline
22 & 70 & \\textbf{MOHAMMAD FUZAIL} \\newline \\small MOHAMMAD ASIF PAREKH & & & & & & & & & & \\\\ \\hline
23 & 73 & \\textbf{MUHAMMAD USAMA RAZA} \\newline \\small MUHAMMAD ALI & & & & & & & & & & \\\\ \\hline
24 & 1052 & \\textbf{MUHAMMAD HAMZA AMIR} \\newline \\small MUHAMAD AMIR & & & & & & & & & & \\\\ \\hline
25 & 1054 & \\textbf{MUHAMMAD FAIZ ASLAM} \\newline \\small ASLAM & & & & & & & & & & \\\\ \\hline
26 & 1032 & \\textbf{MUHAMMAD ILIYAS PALH UMAIR MUSTAFA} \\newline \\small UMAIR MUSTAFA & & & & & & & & & & \\\\ \\hline
27 & 1034 & \\textbf{MUHAMMAD OSAID ALI SHEIKH} \\newline \\small SHEIKH MUHAMMAD KASHIF & & & & & & & & & & \\\\ \\hline
28 & 1071 & \\textbf{MUHAMMAD ANZAL AMIR} \\newline \\small AMIR & & & & & & & & & & \\\\ \\hline
\\end{longtable}

\\newpage
% ==========================================
% CLASS VIII MARKSHEET
% ==========================================
\\section*{Class VIII (Matric)}
\\begin{longtable}{|c|c|p{7.5cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|}
\\hline
\\textbf{S.No} & \\textbf{GR No} & \\textbf{Student Name / Father Name} & \\textbf{Urd} & \\textbf{Isl} & \\textbf{Phy} & \\textbf{Eng} & \\textbf{Mat} & \\textbf{Che} & \\textbf{Com} & \\textbf{Total} & \\textbf{\\%age} \\\\ \\hline
\\endhead
1 & 856 & \\textbf{MUHAMMAD AARIZ} \\newline \\small MANSOOR IQBAL & & & & & & & & & \\\\ \\hline
2 & 862 & \\textbf{MUHAMMAD AHMED} \\newline \\small MUHAMMAD SHAHID & & & & & & & & & \\\\ \\hline
3 & 871 & \\textbf{MUHAMMAD HASSAN RAZA} \\newline \\small FURQAN & & & & & & & & & \\\\ \\hline
4 & 881 & \\textbf{MUHAMMAD ZAZAN} \\newline \\small MUHAMMAD JASEEM UDDIN & & & & & & & & & \\\\ \\hline
5 & 883 & \\textbf{HANZLA NOMAN} \\newline \\small MUHAMMAD NOMAN & & & & & & & & & \\\\ \\hline
6 & 26 & \\textbf{MASAM ALI HINGORJA} \\newline \\small MUHAMMAD ALI & & & & & & & & & \\\\ \\hline
7 & 885 & \\textbf{MUHAMMAD JAYAAN} \\newline \\small FAZAL MUSTAFA & & & & & & & & & \\\\ \\hline
8 & 43 & \\textbf{SYED HASNAIN SHAHID} \\newline \\small SYED SHAHID IQBAL & & & & & & & & & \\\\ \\hline
9 & 902 & \\textbf{USAID RAZA ATTARI} \\newline \\small MUHAMMAD FAWAD ATTARI & & & & & & & & & \\\\ \\hline
10 & 908 & \\textbf{MUHAMMAD AYAAN} \\newline \\small ASGHAR ALI & & & & & & & & & \\\\ \\hline
11 & 977 & \\textbf{MUHAMMAD BILAL} \\newline \\small TOUSEEF IQBAL & & & & & & & & & \\\\ \\hline
12 & 986 & \\textbf{MUHAMMAD HUSSAIN} \\newline \\small FAHAD & & & & & & & & & \\\\ \\hline
13 & 451 & \\textbf{SYED ABEER ALI} \\newline \\small SYED REHMAN ALI & & & & & & & & & \\\\ \\hline
14 & 82 & \\textbf{ABDULLAH FAISAL} \\newline \\small FAISAL & & & & & & & & & \\\\ \\hline
15 & 1052 & \\textbf{ABDUL REHMAN REHMAN SIDDIQUI} \\newline \\small ADNAN & & & & & & & & & \\\\ \\hline
16 & 1053 & \\textbf{MUHAMAD QASIM} \\newline \\small ASIF & & & & & & & & & \\\\ \\hline
17 & 1043 & \\textbf{UBAID RAZA ATTARI SATTAR} \\newline \\small ABDUL SATTAR ATTARI & & & & & & & & & \\\\ \\hline
18 & 921 & \\textbf{MOHAMMAD AFZAL} \\newline \\small IRFAN & & & & & & & & & \\\\ \\hline
19 & 1062 & \\textbf{HASSAN RAZA ATTARI SHOUKAT} \\newline \\small SHOUKAT ALI & & & & & & & & & \\\\ \\hline
20 & 1064 & \\textbf{MUHAMMAD FAIZ RAZA REHMAN} \\newline \\small REHMAN & & & & & & & & & \\\\ \\hline
21 & 1065 & \\textbf{MUHAMMAD HUNAIN SHAKEEL} \\newline \\small MUHAMMAD SHAKEEL & & & & & & & & & \\\\ \\hline
22 & 1935 & \\textbf{MUHAMMAD ROHAN RAZA} \\newline \\small IMRAN AHMED & & & & & & & & & \\\\ \\hline
23 & 1936 & \\textbf{MUHAMMAD ROMAN RAZA} \\newline \\small IMRAN AHMED & & & & & & & & & \\\\ \\hline
24 & 1937 & \\textbf{MUHAMMAD HASSAN KHAN} \\newline \\small MUHAMMAD WASI & & & & & & & & & \\\\ \\hline
25 & 1938 & \\textbf{MUHAMMAD ABDULLAH SAJID} \\newline \\small MUHAMMAD SAJID & & & & & & & & & \\\\ \\hline
26 & 1950 & \\textbf{MUHAMMAD MUSAB} \\newline \\small MUHAMMAD UMAIR & & & & & & & & & \\\\ \\hline
\\end{longtable}

\\newpage
% ==========================================
% CLASS IX MARKSHEET
% ==========================================
\\section*{Class IX (Matric)}
\\begin{longtable}{|c|c|p{7.5cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|}
\\hline
\\textbf{S.No} & \\textbf{GR No} & \\textbf{Student Name / Father Name} & \\textbf{Mat} & \\textbf{Urd} & \\textbf{Phy} & \\textbf{Eng} & \\textbf{Isl} & \\textbf{Che} & \\textbf{Com} & \\textbf{Total} & \\textbf{\\%age} \\\\ \\hline
\\endhead
1 & 689 & \\textbf{MUHAMMAD SHAHEER ABID} \\newline \\small ABID ALI & & & & & & & & & \\\\ \\hline
2 & 690 & \\textbf{AHMED RAZA KHAN} \\newline \\small MUHAMMMAD TANVEER KHAN & & & & & & & & & \\\\ \\hline
3 & 848 & \\textbf{ABDULLAH} \\newline \\small MUHAMMAD SHAZAD & & & & & & & & & \\\\ \\hline
4 & 698 & \\textbf{MUHAMMAD NOMAN RAZA} \\newline \\small MOAZZAM ALI AZMI QADRI & & & & & & & & & \\\\ \\hline
5 & 699 & \\textbf{ABDUL BASIT} \\newline \\small MUNAWAR HUSSAIN & & & & & & & & & \\\\ \\hline
6 & 714 & \\textbf{MUHAMMAD ANAS} \\newline \\small MUHAMAMD NAVEED & & & & & & & & & \\\\ \\hline
7 & 723 & \\textbf{MUHAMMAD MUSAB ALI} \\newline \\small MUHAMAMAD RIZWAN & & & & & & & & & \\\\ \\hline
8 & 14 & \\textbf{MUHAMMAD SHABAN RAZA} \\newline \\small WASIF HUSSAIN & & & & & & & & & \\\\ \\hline
9 & 15 & \\textbf{ZULQARNAIN} \\newline \\small MOHAMMAD SHARIF & & & & & & & & & \\\\ \\hline
10 & 727 & \\textbf{MUHAMAMD ALI RAZA} \\newline \\small MUHAMAMD AKRAM & & & & & & & & & \\\\ \\hline
11 & 18 & \\textbf{MUHAMMAD RABIE} \\newline \\small SYED HUMAYON HASHMI & & & & & & & & & \\\\ \\hline
12 & 733 & \\textbf{TIHAMI} \\newline \\small MUHAMMAD ASHRAF & & & & & & & & & \\\\ \\hline
13 & 1036 & \\textbf{HASAN RAZA} \\newline \\small FAISAL MAJEED & & & & & & & & & \\\\ \\hline
14 & 751 & \\textbf{MUHAMMAD MURTAZA} \\newline \\small GHULAM MUHAMMAD & & & & & & & & & \\\\ \\hline
15 & 756 & \\textbf{MAAZ} \\newline \\small HUMAIR & & & & & & & & & \\\\ \\hline
16 & 32 & \\textbf{MUHAMMAD UBAID RAZA} \\newline \\small MUHAMMAD HUSSAIN & & & & & & & & & \\\\ \\hline
17 & 763 & \\textbf{MUHAMMAD MUSTAFA RAZA} \\newline \\small AFTAB AHMED GHAZI & & & & & & & & & \\\\ \\hline
18 & 940 & \\textbf{AZAIN AHMED} \\newline \\small IMTIAZ AHMED & & & & & & & & & \\\\ \\hline
19 & 969 & \\textbf{MOHAMMAD HASHIR} \\newline \\small MUHAMMAD REHAN & & & & & & & & & \\\\ \\hline
20 & 58 & \\textbf{MURTAZA} \\newline \\small MUHAMMAD KHALID & & & & & & & & & \\\\ \\hline
21 & 989 & \\textbf{MUHAMMAD UMER} \\newline \\small MUHAMMAD IRFAN & & & & & & & & & \\\\ \\hline
22 & 990 & \\textbf{MUHAMMAD HASSAN RAZA} \\newline \\small FAHAD & & & & & & & & & \\\\ \\hline
23 & 998 & \\textbf{MUHAMMAD FAWWAD ALAM} \\newline \\small MUHAMMAD FAREED & & & & & & & & & \\\\ \\hline
24 & 64 & \\textbf{OSAID RAZA} \\newline \\small MUHAMMAD KASHIF & & & & & & & & & \\\\ \\hline
25 & 79 & \\textbf{MUHAMMAD FAZAL} \\newline \\small MUHAMMAD UMER & & & & & & & & & \\\\ \\hline
26 & 210 & \\textbf{MUHAMMAD NOOR} \\newline \\small MEHBOOB & & & & & & & & & \\\\ \\hline
27 & 1040 & \\textbf{MUHAMMAD HASSAN MOIN} \\newline \\small MUHAMMAD MOIN & & & & & & & & & \\\\ \\hline
28 & 1041 & \\textbf{MUHAMMAD ABDUL QADIR} \\newline \\small MUHAMMAD FAISAL & & & & & & & & & \\\\ \\hline
29 & 1041 & \\textbf{MUHAMMAD ASHFAQ} \\newline \\small ABDUL RAZZAQ & & & & & & & & & \\\\ \\hline
\\end{longtable}

\\newpage
% ==========================================
% CLASS X MARKSHEET
% ==========================================
\\section*{Class X (Matric)}
\\begin{longtable}{|c|c|p{5.5cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|}
\\hline
\\textbf{S.No} & \\textbf{GR No} & \\textbf{Student Name / Father Name} & \\textbf{Isl} & \\textbf{Sin} & \\textbf{Eng} & \\textbf{P.St} & \\textbf{Mat} & \\textbf{Phy} & \\textbf{Com} & \\textbf{Bio} & \\textbf{Che} & \\textbf{Total} & \\textbf{\\%age} \\\\ \\hline
\\endhead
1 & 574 & \\textbf{MUHAMMAD WAIZ} \\newline \\small ABDUL HAFEEZ & & & & & & & & & & & \\\\ \\hline
2 & 587 & \\textbf{MUHAMAMD HANZALA} \\newline \\small MUHAMAMD AKRAM & & & & & & & & & & & \\\\ \\hline
3 & 588 & \\textbf{MUHAMMAD HURAIRA} \\newline \\small HASEEB AHMED & & & & & & & & & & & \\\\ \\hline
4 & 40 & \\textbf{ALI RAZA} \\newline \\small KASHIF RAZA & & & & & & & & & & & \\\\ \\hline
5 & 650 & \\textbf{MUHAMMAD HUZAIFA JAVED} \\newline \\small JAVED IQBAL & & & & & & & & & & & \\\\ \\hline
6 & 651 & \\textbf{USMAN GHANI} \\newline \\small MUHAMMAD JAFFAR & & & & & & & & & & & \\\\ \\hline
7 & 787 & \\textbf{MUHAMMAD DARIM FARRUKH} \\newline \\small FARRUKH AZIZ & & & & & & & & & & & \\\\ \\hline
8 & 798 & \\textbf{MUHAMMAD ARHAM} \\newline \\small MUHAMMAD ASIF & & & & & & & & & & & \\\\ \\hline
9 & 800 & \\textbf{MUHAMMAD AARFEEN} \\newline \\small MUHAMMAD SABIR & & & & & & & & & & & \\\\ \\hline
10 & 804 & \\textbf{ABDUL MANNAN} \\newline \\small MUHAMMAD NOMAN & & & & & & & & & & & \\\\ \\hline
11 & 1064 & \\textbf{MOHAMMAD ANUS} \\newline \\small MOHAMMAD AAMIR & & & & & & & & & & & \\\\ \\hline
12 & 07 & \\textbf{MUHAMMAD HASAN RAZA} \\newline \\small BILAL AHMED & & & & & & & & & & & \\\\ \\hline
13 & 55 & \\textbf{SYED MUHAMMAD HUSSAIN} \\newline \\small SYED ASGHAR ALI & & & & & & & & & & & \\\\ \\hline
14 & 955 & \\textbf{MUHAMMAD AYAN} \\newline \\small FURQAN & & & & & & & & & & & \\\\ \\hline
15 & 992 & \\textbf{SYED MUHAMMAD RAHIM} \\newline \\small SYED MUHAMMAD DANISH & & & & & & & & & & & \\\\ \\hline
16 & 83 & \\textbf{GHULAM MUSTAFA} \\newline \\small MUHAMMAD AMIR & & & & & & & & & & & \\\\ \\hline
17 & 85 & \\textbf{MUHAMMAD ALI KHAN} \\newline \\small ABDUL KAREEM KHAN & & & & & & & & & & & \\\\ \\hline
18 & 1061 & \\textbf{MUHAMMAD HASHIR} \\newline \\small FAHAD & & & & & & & & & & & \\\\ \\hline
19 & 1065 & \\textbf{HAFIZ SYED MUHAMMAD HAMZA ALI NAQVI} \\newline \\small SYED GHAZANFAR ALI NAQVI & & & & & & & & & & & \\\\ \\hline
20 & 1062 & \\textbf{ABDUS SUBHAN ALWANI} \\newline \\small MUHAMMAD YOUSUF ALWANI & & & & & & & & & & & \\\\ \\hline
21 & 1063 & \\textbf{ABDUL REHMAN ASLAM} \\newline \\small MUHAMMAD ASLAM & & & & & & & & & & & \\\\ \\hline
22 & 1088 & \\textbf{MUHAMMAD SALMAN} \\newline \\small MUHAMMAD NOMAN & & & & & & & & & & & \\\\ \\hline
23 & 530 & \\textbf{AHMED RAZA} \\newline \\small FAYYAZ AHMED & & & & & & & & & & & \\\\ \\hline
24 & 541 & \\textbf{MUHAMMAD HAADI} \\newline \\small MUHAMMAD KHURRAM & & & & & & & & & & & \\\\ \\hline
25 & 544 & \\textbf{SUFIYAN RAZA ATTARI} \\newline \\small AHSAN ALI & & & & & & & & & & & \\\\ \\hline
26 & 562 & \\textbf{MUHAMMAD ONAIS RAZA} \\newline \\small MUHAMMAD AZEEM & & & & & & & & & & & \\\\ \\hline
\\end{longtable}

\\newpage
% ==========================================
% HIFZ STUDENTS MARKSHEET
% ==========================================
\\section*{Hifz Class (Matric)}
\\begin{longtable}{|c|c|p{7.5cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|p{1.1cm}|}
\\hline
\\textbf{S.No} & \\textbf{GR No} & \\textbf{Student Name / Father Name} & \\textbf{Sub 1} & \\textbf{Sub 2} & \\textbf{Sub 3} & \\textbf{Sub 4} & \\textbf{Sub 5} & \\textbf{Sub 6} & \\textbf{Sub 7} & \\textbf{Total} & \\textbf{\\%age} \\\\ \\hline
\\endhead
1 & 1036 & \\textbf{MUHAMMAD ABDUL HADI KASHIF} \\newline \\small MUHAMMAD KASHIF & & & & & & & & & \\\\ \\hline
2 & 946 & \\textbf{MUHAMMAD AMMAR} \\newline \\small MUHAMMAD FAHAD SALEEM & & & & & & & & & \\\\ \\hline
3 & 33 & \\textbf{MUHAMMAD MUMTAZ KHAN} \\newline \\small ZARYAB KHAN & & & & & & & & & \\\\ \\hline
4 & 1523 & \\textbf{MUHAMMAD ABU BAKAR} \\newline \\small MUHAMMAD FAHAD SALEEM & & & & & & & & & \\\\ \\hline
5 & 1495 & \\textbf{NOOR MUHAMMAD} \\newline \\small USMAN GHANI & & & & & & & & & \\\\ \\hline
6 & 1711 & \\textbf{MUHAMMAD JAISH JUNID AHMED SIDDIQUI} \\newline \\small JUNAID AHMED SIDDIQUI & & & & & & & & & \\\\ \\hline
7 & 1722 & \\textbf{MUHAMMAD HUSSAIN} \\newline \\small MUHAMMAD SABIR & & & & & & & & & \\\\ \\hline
8 & 1832 & \\textbf{AHMED RAZA} \\newline \\small MUAHMMAD ASAD & & & & & & & & & \\\\ \\hline
9 & 1602 & \\textbf{MUHAMMAD ALIYAN} \\newline \\small MUHAMMAD SHAFEEQ & & & & & & & & & \\\\ \\hline
10 & 1941 & \\textbf{MUHAMMAD MUSLIM BIN AQEEL} \\newline \\small AQEEL NAWAZ & & & & & & & & & \\\\ \\hline
11 & 92 & \\textbf{GHULAM GHOUS ALI} \\newline \\small AZIZ ALI KHAN & & & & & & & & & \\\\ \\hline
12 & 1029 & \\textbf{SYED SHAWAIZ ARSALAN} \\newline \\small SYED ARSALAN & & & & & & & & & \\\\ \\hline
13 & 1046 & \\textbf{MUHAMMAD BURHAN HUMAIYON} \\newline \\small HUMAYION AHMED ANSARI & & & & & & & & & \\\\ \\hline
14 & 1078 & \\textbf{MUHAMMADS ABU BAKR HAMID} \\newline \\small MUHAMMAD HAMID & & & & & & & & & \\\\ \\hline
15 & 1076 & \\textbf{MUHAMMAD AYAN} \\newline \\small MUHAMMAD ALI YAQOOB & & & & & & & & & \\\\ \\hline
16 & 1942 & \\textbf{MUHAMMAD ARMAN} \\newline \\small MUHAMMAD OWAIS RAZA & & & & & & & & & \\\\ \\hline
17 & 1943 & \\textbf{MUHAMMAD HASHIR RAJPOT} \\newline \\small MUHAMMAD ALI RAJPOT & & & & & & & & & \\\\ \\hline
\\end{longtable}
`;

const lines = raw.split('\n');
const result = {};
let currentClass = null;
let currentPrefix = null;
let counter = 1;

for (let line of lines) {
  if (line.includes('\\section*{Class IV')) { currentClass = 'Class IV'; currentPrefix = 'c4'; counter = 1; result[currentClass] = []; }
  else if (line.includes('\\section*{Class V ')) { currentClass = 'Class V'; currentPrefix = 'c5'; counter = 1; result[currentClass] = []; }
  else if (line.includes('\\section*{Class VI ')) { currentClass = 'Class VI'; currentPrefix = 'c6'; counter = 1; result[currentClass] = []; }
  else if (line.includes('\\section*{Class VII ')) { currentClass = 'Class VII'; currentPrefix = 'c7'; counter = 1; result[currentClass] = []; }
  else if (line.includes('\\section*{Class VIII ')) { currentClass = 'Class VIII'; currentPrefix = 'c8'; counter = 1; result[currentClass] = []; }
  else if (line.includes('\\section*{Class IX ')) { currentClass = 'Class IX'; currentPrefix = 'c9'; counter = 1; result[currentClass] = []; }
  else if (line.includes('\\section*{Class X ')) { currentClass = 'Class X'; currentPrefix = 'c10'; counter = 1; result[currentClass] = []; }
  else if (line.includes('\\section*{Hifz Class')) { currentClass = 'Hifz Class'; currentPrefix = 'hifz'; counter = 1; result[currentClass] = []; }

  if (currentClass && line.match(/^\d+\s+&\s+\d+/)) {
    // Looks like a student line
    // e.g. 1 & 128 & \textbf{MUHAMMAD AHMED} \newline \small MUHAMMAD ATIQUE & & & ... \\ \hline
    const parts = line.split('&');
    if (parts.length >= 3) {
      const sNo = parseInt(parts[0].trim());
      const grNo = parts[1].trim();
      const namePart = parts[2].trim();
      
      const nameMatch = namePart.match(/\\textbf\{([^}]+)\}/);
      const fnameMatch = namePart.match(/\\small\s+([^&]+)/);
      
      const name = nameMatch ? nameMatch[1].trim() : '';
      const fname = fnameMatch ? fnameMatch[1].trim() : '';

      result[currentClass].push({
        id: `${currentPrefix}-${counter}`,
        sNo,
        grNo,
        name,
        fatherName: fname,
        marks: {}
      });
      counter++;
    }
  }
}

const output = `import { ClassName, Student } from '../types/marksheet';

export const INITIAL_STUDENTS: Record<ClassName, Student[]> = ${JSON.stringify(result, null, 2)};
`;

fs.writeFileSync('src/data/initialStudents.ts', output);
console.log('Students parsed successfully.');
