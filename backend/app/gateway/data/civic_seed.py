"""Deterministic seed data for the Philadelphia civic map feature.

Generates institutions, contact records, and resolution records using a fixed
random seed so that every process restart produces identical data.
"""

from __future__ import annotations

import random
from collections import Counter
from datetime import UTC, datetime, timedelta

# ---------------------------------------------------------------------------
# Deterministic RNG
# ---------------------------------------------------------------------------
random.seed(42)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_id_counter = 0


def _next_id(prefix: str = "") -> str:
    global _id_counter
    _id_counter += 1
    return f"{prefix}{_id_counter}"


def _jitter(base: float, magnitude: float = 0.0008) -> float:
    """Add small random offset so map markers don't perfectly overlap."""
    return round(base + random.uniform(-magnitude, magnitude), 6)


def _random_iso_date(start: datetime, end: datetime) -> str:
    delta = end - start
    offset = random.randint(0, int(delta.total_seconds()))
    return (start + timedelta(seconds=offset)).isoformat()


# ---------------------------------------------------------------------------
# Time boundaries
# ---------------------------------------------------------------------------
_NOW = datetime(2026, 4, 11, 12, 0, 0, tzinfo=UTC)
_SIX_MONTHS_AGO = _NOW - timedelta(days=180)

# ---------------------------------------------------------------------------
# Philadelphia zip codes
# ---------------------------------------------------------------------------
_PHILLY_ZIPS = [f"191{str(i).zfill(2)}" for i in range(1, 55)]  # 19101-19154

# ---------------------------------------------------------------------------
# Issue categories with weights (10 categories)
# ---------------------------------------------------------------------------
_ISSUE_CATEGORIES = [
    "abandoned-vehicles",  # 18%
    "illegal-dumping",     # 14%
    "infrastructure",      # 12%
    "graffiti",            # 8%
    "housing",             # 10%
    "safety",              # 8%
    "vacant-lots",         # 7%
    "permits",             # 6%
    "utilities",           # 7%
    "other",               # 10%
]
_ISSUE_WEIGHTS = [18, 14, 12, 8, 10, 8, 7, 6, 7, 10]

# ---------------------------------------------------------------------------
# Institutions
# ---------------------------------------------------------------------------

_CITY_HALL = "1400 John F. Kennedy Blvd, Philadelphia, PA 19107"
_CITY_HALL_LAT = 39.9526
_CITY_HALL_LNG = -75.1635

institutions: list[dict] = [
    # ====================================================================
    # City Government (18)
    # ====================================================================
    {
        "id": "inst-1",
        "name": "Mayor's Office",
        "category": "city-government",
        "address": f"City Hall, {_CITY_HALL}",
        "phone": "215-686-2181",
        "coordinates": [_CITY_HALL_LNG, _CITY_HALL_LAT],
        "description": "Office of the Mayor of Philadelphia",
        "website": "https://www.phila.gov/departments/mayor/",
        "officeholder": "Cherelle Parker",
        "district": None,
    },
    {
        "id": "inst-2",
        "name": "Philadelphia Water Department",
        "category": "city-government",
        "address": "1101 Market St, Philadelphia, PA 19107",
        "phone": "215-685-6300",
        "coordinates": [-75.1583, 39.9523],
        "description": "Manages drinking water, wastewater, and stormwater for the city",
        "website": "https://water.phila.gov/",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-3",
        "name": "Streets Department",
        "category": "city-government",
        "address": "1401 John F. Kennedy Blvd, 7th Floor, Philadelphia, PA 19102",
        "phone": "215-686-5560",
        "coordinates": [-75.1642, 39.9536],
        "description": "Responsible for street cleaning, trash collection, and road maintenance",
        "website": "https://www.phila.gov/departments/department-of-streets/",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-4",
        "name": "Department of Licenses & Inspections",
        "category": "city-government",
        "address": "1401 John F. Kennedy Blvd, 11th Floor, Philadelphia, PA 19102",
        "phone": "215-686-2463",
        "coordinates": [-75.1642, 39.9536],
        "description": "Enforces building codes, issues permits and licenses",
        "website": "https://www.phila.gov/departments/department-of-licenses-and-inspections/",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-5",
        "name": "Department of Revenue",
        "category": "city-government",
        "address": "1401 John F. Kennedy Blvd, Concourse Level, Philadelphia, PA 19102",
        "phone": "215-686-6600",
        "coordinates": [-75.1642, 39.9536],
        "description": "Collects taxes and manages city revenue",
        "website": "https://www.phila.gov/departments/department-of-revenue/",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-6",
        "name": "Department of Public Health",
        "category": "city-government",
        "address": "1101 Market St, Philadelphia, PA 19107",
        "phone": "215-685-5488",
        "coordinates": [-75.1583, 39.9523],
        "description": "Protects and promotes the health of all Philadelphians",
        "website": "https://www.phila.gov/departments/department-of-public-health/",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-7",
        "name": "Philadelphia Police Headquarters",
        "category": "city-government",
        "address": "400 N Broad St, Philadelphia, PA 19130",
        "phone": "215-686-1776",
        "coordinates": [-75.1627, 39.9597],
        "description": "Headquarters of the Philadelphia Police Department",
        "website": "https://www.phillypolice.com/",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-8",
        "name": "Philly311",
        "category": "city-government",
        "address": "1401 John F. Kennedy Blvd, Philadelphia, PA 19102",
        "phone": "311",
        "coordinates": [-75.1642, 39.9536],
        "description": "Non-emergency city services and information hotline",
        "website": "https://www.phila.gov/departments/philly311/",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-9",
        "name": "Office of Property Assessment",
        "category": "city-government",
        "address": "601 Walnut St, Suite 300, Philadelphia, PA 19106",
        "phone": "215-686-4334",
        "coordinates": [-75.1520, 39.9468],
        "description": "Assesses the value of all property in Philadelphia for tax purposes",
        "website": "https://www.phila.gov/departments/office-of-property-assessment/",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-10",
        "name": "Parks & Recreation Department",
        "category": "city-government",
        "address": "1515 Arch St, 10th Floor, Philadelphia, PA 19102",
        "phone": "215-683-3600",
        "coordinates": [-75.1630, 39.9540],
        "description": "Manages parks, recreation centers, and public spaces",
        "website": "https://www.phila.gov/departments/philadelphia-parks-recreation/",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-11",
        "name": "Office of Homeless Services",
        "category": "city-government",
        "address": "1401 John F. Kennedy Blvd, 10th Floor, Philadelphia, PA 19102",
        "phone": "215-686-7177",
        "coordinates": [-75.1642, 39.9536],
        "description": "Coordinates services for individuals and families experiencing homelessness",
        "website": "https://www.phila.gov/departments/office-of-homeless-services/",
        "officeholder": None,
        "district": None,
    },
    # --- 7 new city-government institutions ---
    {
        "id": "inst-12",
        "name": "Managing Director's Office",
        "category": "city-government",
        "address": "1401 JFK Blvd, Suite 1430, Philadelphia, PA 19102",
        "phone": "215-686-3480",
        "coordinates": [-75.1642, 39.9538],
        "description": "Oversees city operating departments and coordinates government services",
        "website": "https://www.phila.gov/departments/managing-directors-office/",
        "officeholder": "Adam K. Thiel",
        "district": None,
    },
    {
        "id": "inst-13",
        "name": "Department of Commerce",
        "category": "city-government",
        "address": "1515 Arch St, 12th Floor, Philadelphia, PA 19102",
        "phone": "215-683-2100",
        "coordinates": [-75.1630, 39.9542],
        "description": "Promotes economic development and supports businesses across Philadelphia",
        "website": "https://www.phila.gov/departments/department-of-commerce/",
        "officeholder": "Karen Fegely",
        "district": None,
    },
    {
        "id": "inst-14",
        "name": "Department of Human Services",
        "category": "city-government",
        "address": "1515 Arch St, Philadelphia, PA 19102",
        "phone": "215-683-6100",
        "coordinates": [-75.1630, 39.9544],
        "description": "Provides child welfare and juvenile justice services",
        "website": "https://www.phila.gov/departments/department-of-human-services/",
        "officeholder": "Kimberly Ali",
        "district": None,
    },
    {
        "id": "inst-15",
        "name": "Philadelphia Fire Department",
        "category": "city-government",
        "address": "240 Spring Garden St, Philadelphia, PA 19123",
        "phone": "215-686-1300",
        "coordinates": [-75.1530, 39.9620],
        "description": "Provides fire protection, EMS, and emergency response services",
        "website": "https://www.phila.gov/departments/philadelphia-fire-department/",
        "officeholder": "Jeffrey Thompson",
        "district": None,
    },
    {
        "id": "inst-16",
        "name": "District Attorney's Office",
        "category": "city-government",
        "address": "Three South Penn Square, Philadelphia, PA 19107",
        "phone": "215-686-8000",
        "coordinates": [-75.1640, 39.9520],
        "description": "Prosecutes criminal cases and seeks justice for victims of crime",
        "website": "https://phillyda.org/",
        "officeholder": "Larry Krasner",
        "district": None,
    },
    {
        "id": "inst-17",
        "name": "City Controller's Office",
        "category": "city-government",
        "address": "1401 JFK Blvd, Room 1230, Philadelphia, PA 19102",
        "phone": "215-686-6680",
        "coordinates": [-75.1643, 39.9535],
        "description": "Audits city finances and monitors fiscal accountability",
        "website": "https://controller.phila.gov/",
        "officeholder": "Christy Brady",
        "district": None,
    },
    {
        "id": "inst-18",
        "name": "Sheriff's Office",
        "category": "city-government",
        "address": "100 S Broad St, 5th Floor, Philadelphia, PA 19110",
        "phone": "215-686-3559",
        "coordinates": [-75.1633, 39.9510],
        "description": "Enforces court orders, serves warrants, and conducts property sales",
        "website": "https://phillysheriff.com/",
        "officeholder": "Rochelle Bilal",
        "district": None,
    },

    # ====================================================================
    # City Council (17)
    # ====================================================================
    # --- District members (10) ---
    {
        "id": "inst-19",
        "name": "Council Member Mark Squilla",
        "category": "city-council",
        "address": f"Room 332, City Hall, {_CITY_HALL}",
        "phone": "215-686-3458",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, District 1",
        "website": "https://phlcouncil.com/mark-squilla/",
        "officeholder": "Mark Squilla",
        "district": "1",
    },
    {
        "id": "inst-20",
        "name": "Council President Kenyatta Johnson",
        "category": "city-council",
        "address": f"Room 580, City Hall, {_CITY_HALL}",
        "phone": "215-686-2070",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council President, District 2",
        "website": "https://phlcouncil.com/kenyatta-johnson/",
        "officeholder": "Kenyatta Johnson",
        "district": "2",
    },
    {
        "id": "inst-21",
        "name": "Council Member Jamie Gauthier",
        "category": "city-council",
        "address": f"Room 316, City Hall, {_CITY_HALL}",
        "phone": "215-686-0459",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, District 3",
        "website": "https://phlcouncil.com/jamie-gauthier/",
        "officeholder": "Jamie Gauthier",
        "district": "3",
    },
    {
        "id": "inst-22",
        "name": "Council Member Curtis Jones Jr.",
        "category": "city-council",
        "address": f"Room 404, City Hall, {_CITY_HALL}",
        "phone": "215-686-3416",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, District 4",
        "website": "https://phlcouncil.com/curtis-jones-jr/",
        "officeholder": "Curtis Jones Jr.",
        "district": "4",
    },
    {
        "id": "inst-23",
        "name": "Council Member Jeffery Young Jr.",
        "category": "city-council",
        "address": f"Room 586, City Hall, {_CITY_HALL}",
        "phone": "215-686-3442",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, District 5",
        "website": "https://phlcouncil.com/jeffery-young-jr/",
        "officeholder": "Jeffery Young Jr.",
        "district": "5",
    },
    {
        "id": "inst-24",
        "name": "Council Member Michael Driscoll",
        "category": "city-council",
        "address": f"Room 313, City Hall, {_CITY_HALL}",
        "phone": "215-686-3444",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, District 6",
        "website": "https://phlcouncil.com/michael-driscoll/",
        "officeholder": "Michael Driscoll",
        "district": "6",
    },
    {
        "id": "inst-25",
        "name": "Council Member Quetcy Lozada",
        "category": "city-council",
        "address": f"Room 484, City Hall, {_CITY_HALL}",
        "phone": "215-686-3448",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, District 7",
        "website": "https://phlcouncil.com/quetcy-lozada/",
        "officeholder": "Quetcy Lozada",
        "district": "7",
    },
    {
        "id": "inst-26",
        "name": "Council Member Cindy Bass",
        "category": "city-council",
        "address": f"Room 508, City Hall, {_CITY_HALL}",
        "phone": "215-686-3424",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, District 8",
        "website": "https://phlcouncil.com/cindy-bass/",
        "officeholder": "Cindy Bass",
        "district": "8",
    },
    {
        "id": "inst-27",
        "name": "Council Member Anthony Phillips",
        "category": "city-council",
        "address": f"Room 594, City Hall, {_CITY_HALL}",
        "phone": "215-686-3455",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, District 9",
        "website": "https://phlcouncil.com/anthony-phillips/",
        "officeholder": "Anthony Phillips",
        "district": "9",
    },
    {
        "id": "inst-28",
        "name": "Council Member Brian J. O'Neill",
        "category": "city-council",
        "address": f"Room 562, City Hall, {_CITY_HALL}",
        "phone": "215-686-3422",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, District 10",
        "website": "https://phlcouncil.com/brian-oneill/",
        "officeholder": "Brian J. O'Neill",
        "district": "10",
    },
    # --- At-Large members (7) ---
    {
        "id": "inst-29",
        "name": "Council Member Katherine Gilmore Richardson",
        "category": "city-council",
        "address": f"Room 581, City Hall, {_CITY_HALL}",
        "phone": "215-686-0454",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, At-Large (Majority Leader)",
        "website": "https://phlcouncil.com/katherine-gilmore-richardson/",
        "officeholder": "Katherine Gilmore Richardson",
        "district": "At-Large",
    },
    {
        "id": "inst-30",
        "name": "Council Member Isaiah Thomas",
        "category": "city-council",
        "address": f"Room 330A, City Hall, {_CITY_HALL}",
        "phone": "215-686-3446",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, At-Large (Majority Whip)",
        "website": "https://phlcouncil.com/isaiah-thomas/",
        "officeholder": "Isaiah Thomas",
        "district": "At-Large",
    },
    {
        "id": "inst-31",
        "name": "Council Member Jim Harrity",
        "category": "city-council",
        "address": f"Room 408, City Hall, {_CITY_HALL}",
        "phone": "215-686-8295",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, At-Large",
        "website": "https://phlcouncil.com/jim-harrity/",
        "officeholder": "Jim Harrity",
        "district": "At-Large",
    },
    {
        "id": "inst-32",
        "name": "Council Member Nina Ahmad",
        "category": "city-council",
        "address": f"Room 577, City Hall, {_CITY_HALL}",
        "phone": "215-686-3450",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, At-Large",
        "website": "https://phlcouncil.com/nina-ahmad/",
        "officeholder": "Nina Ahmad",
        "district": "At-Large",
    },
    {
        "id": "inst-33",
        "name": "Council Member Rue Landau",
        "category": "city-council",
        "address": f"Room 592, City Hall, {_CITY_HALL}",
        "phone": "215-686-3420",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, At-Large",
        "website": "https://phlcouncil.com/rue-landau/",
        "officeholder": "Rue Landau",
        "district": "At-Large",
    },
    {
        "id": "inst-34",
        "name": "Council Member Kendra Brooks",
        "category": "city-council",
        "address": f"Room 312, City Hall, {_CITY_HALL}",
        "phone": "215-686-0461",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, At-Large (Minority Leader)",
        "website": "https://phlcouncil.com/kendra-brooks/",
        "officeholder": "Kendra Brooks",
        "district": "At-Large",
    },
    {
        "id": "inst-35",
        "name": "Council Member Nicolas O'Rourke",
        "category": "city-council",
        "address": f"Room 319A, City Hall, {_CITY_HALL}",
        "phone": "215-686-3452",
        "coordinates": [_jitter(_CITY_HALL_LNG, 0.002), _jitter(_CITY_HALL_LAT, 0.002)],
        "description": "Philadelphia City Council, At-Large (Minority Whip)",
        "website": "https://phlcouncil.com/nicolas-orourke/",
        "officeholder": "Nicolas O'Rourke",
        "district": "At-Large",
    },

    # ====================================================================
    # US Congress (5)
    # ====================================================================
    {
        "id": "inst-36",
        "name": "Sen. John Fetterman",
        "category": "us-congress",
        "address": "200 Chestnut St, Suite 600, Philadelphia, PA 19106",
        "phone": "215-241-1090",
        "coordinates": [-75.1470, 39.9490],
        "description": "United States Senator for Pennsylvania",
        "website": "https://www.fetterman.senate.gov/",
        "officeholder": "John Fetterman",
        "district": "PA",
    },
    {
        "id": "inst-37",
        "name": "Sen. Dave McCormick",
        "category": "us-congress",
        "address": "2000 Market St, Suite 610, Philadelphia, PA 19103",
        "phone": "215-405-9660",
        "coordinates": [-75.1720, 39.9535],
        "description": "United States Senator for Pennsylvania",
        "website": "https://www.mccormick.senate.gov/",
        "officeholder": "Dave McCormick",
        "district": "PA",
    },
    {
        "id": "inst-38",
        "name": "Rep. Brendan Boyle",
        "category": "us-congress",
        "address": "1318 W Girard Ave, Philadelphia, PA 19123",
        "phone": "215-517-6572",
        "coordinates": [-75.1580, 39.9720],
        "description": "U.S. Representative for Pennsylvania's 2nd Congressional District",
        "website": "https://boyle.house.gov/",
        "officeholder": "Brendan Boyle",
        "district": "PA-02",
    },
    {
        "id": "inst-39",
        "name": "Rep. Dwight Evans",
        "category": "us-congress",
        "address": "7174 Ogontz Ave, Philadelphia, PA 19138",
        "phone": "215-276-0340",
        "coordinates": [-75.1465, 40.0560],
        "description": "U.S. Representative for Pennsylvania's 3rd Congressional District",
        "website": "https://evans.house.gov/",
        "officeholder": "Dwight Evans",
        "district": "PA-03",
    },
    {
        "id": "inst-40",
        "name": "Rep. Mary Gay Scanlon",
        "category": "us-congress",
        "address": "2501 Seaport Dr, BH230, Chester, PA 19013",
        "phone": "610-626-2020",
        "coordinates": [-75.3580, 39.8490],
        "description": "U.S. Representative for Pennsylvania's 5th Congressional District",
        "website": "https://scanlon.house.gov/",
        "officeholder": "Mary Gay Scanlon",
        "district": "PA-05",
    },

    # ====================================================================
    # PA State Senate (7)
    # ====================================================================
    {
        "id": "inst-41",
        "name": "State Sen. Nikil Saval",
        "category": "pa-state-senate",
        "address": "1434 Germantown Ave, Philadelphia, PA 19122",
        "phone": "215-592-5750",
        "coordinates": [-75.1460, 39.9720],
        "description": "Pennsylvania State Senator, District 1",
        "website": "https://www.pasenate.com/saval/",
        "officeholder": "Nikil Saval",
        "district": "1",
    },
    {
        "id": "inst-42",
        "name": "State Sen. Christine Tartaglione",
        "category": "pa-state-senate",
        "address": "5321 Oxford Ave, Philadelphia, PA 19124",
        "phone": "215-533-0440",
        "coordinates": [-75.0960, 40.0230],
        "description": "Pennsylvania State Senator, District 2",
        "website": "https://www.pasenate.com/tartaglione/",
        "officeholder": "Christine Tartaglione",
        "district": "2",
    },
    {
        "id": "inst-43",
        "name": "State Sen. Sharif Street",
        "category": "pa-state-senate",
        "address": "1621 W Jefferson St, Philadelphia, PA 19121",
        "phone": "215-227-6161",
        "coordinates": [-75.1690, 39.9760],
        "description": "Pennsylvania State Senator, District 3",
        "website": "https://www.pasenate.com/street/",
        "officeholder": "Sharif Street",
        "district": "3",
    },
    {
        "id": "inst-44",
        "name": "State Sen. Art Haywood",
        "category": "pa-state-senate",
        "address": "7106 Germantown Ave, Philadelphia, PA 19119",
        "phone": "215-242-8171",
        "coordinates": [-75.1720, 40.0510],
        "description": "Pennsylvania State Senator, District 4",
        "website": "https://www.pasenate.com/haywood/",
        "officeholder": "Art Haywood",
        "district": "4",
    },
    {
        "id": "inst-45",
        "name": "State Sen. Jimmy Dillon",
        "category": "pa-state-senate",
        "address": "12361 Academy Pl, Philadelphia, PA 19154",
        "phone": "215-281-2539",
        "coordinates": [-75.0250, 40.0870],
        "description": "Pennsylvania State Senator, District 5",
        "website": "https://www.pasenate.com/dillon/",
        "officeholder": "Jimmy Dillon",
        "district": "5",
    },
    {
        "id": "inst-46",
        "name": "State Sen. Vincent Hughes",
        "category": "pa-state-senate",
        "address": "2401 N 54th St, Philadelphia, PA 19131",
        "phone": "215-879-7777",
        "coordinates": [-75.2280, 39.9870],
        "description": "Pennsylvania State Senator, District 7",
        "website": "https://www.pasenate.com/hughes/",
        "officeholder": "Vincent Hughes",
        "district": "7",
    },
    {
        "id": "inst-47",
        "name": "State Sen. Anthony H. Williams",
        "category": "pa-state-senate",
        "address": "2901 Island Ave, Suite 100, Philadelphia, PA 19153",
        "phone": "215-492-2980",
        "coordinates": [-75.2350, 39.8990],
        "description": "Pennsylvania State Senator, District 8",
        "website": "https://www.pasenate.com/williams/",
        "officeholder": "Anthony H. Williams",
        "district": "8",
    },

    # ====================================================================
    # PA State House (6) -- NEW CATEGORY
    # ====================================================================
    {
        "id": "inst-48",
        "name": "State Rep. Joseph Hohenstein",
        "category": "pa-state-house",
        "address": "7104 Torresdale Ave, Philadelphia, PA 19135",
        "phone": "215-331-2600",
        "coordinates": [-75.0330, 40.0180],
        "description": "Pennsylvania State Representative, District 177",
        "website": "https://www.pahouse.com/Hohenstein/",
        "officeholder": "Joseph Hohenstein",
        "district": "177",
    },
    {
        "id": "inst-49",
        "name": "State Rep. Malcolm Kenyatta",
        "category": "pa-state-house",
        "address": "1501 N Broad St, Suite 17, Philadelphia, PA 19122",
        "phone": "215-978-0311",
        "coordinates": [-75.1600, 39.9760],
        "description": "Pennsylvania State Representative, District 181",
        "website": "https://www.pahouse.com/Kenyatta/",
        "officeholder": "Malcolm Kenyatta",
        "district": "181",
    },
    {
        "id": "inst-50",
        "name": "State Rep. Jordan Harris",
        "category": "pa-state-house",
        "address": "Philadelphia, PA",
        "phone": "215-748-6712",
        "coordinates": [-75.1730, 39.9430],
        "description": "Pennsylvania State Representative, District 186 (Majority Appropriations Chair)",
        "website": "https://www.pahouse.com/Harris/",
        "officeholder": "Jordan Harris",
        "district": "186",
    },
    {
        "id": "inst-51",
        "name": "State Rep. Rick Krajewski",
        "category": "pa-state-house",
        "address": "4712 Baltimore Ave, Philadelphia, PA 19143",
        "phone": "215-724-2227",
        "coordinates": [-75.2150, 39.9490],
        "description": "Pennsylvania State Representative, District 188",
        "website": "https://www.pahouse.com/Krajewski/",
        "officeholder": "Rick Krajewski",
        "district": "188",
    },
    {
        "id": "inst-52",
        "name": "State Rep. G. Roni Green",
        "category": "pa-state-house",
        "address": "1719 N 52nd St, Philadelphia, PA 19131",
        "phone": "833-321-9070",
        "coordinates": [-75.2230, 39.9830],
        "description": "Pennsylvania State Representative, District 190",
        "website": "https://www.pahouse.com/Green/",
        "officeholder": "G. Roni Green",
        "district": "190",
    },
    {
        "id": "inst-53",
        "name": "State Rep. Joanna McClinton",
        "category": "pa-state-house",
        "address": "Philadelphia, PA",
        "phone": "215-748-6712",
        "coordinates": [-75.2450, 39.9320],
        "description": "Pennsylvania State Representative, District 191 (Speaker of the House)",
        "website": "https://www.pahouse.com/McClinton/",
        "officeholder": "Joanna McClinton",
        "district": "191",
    },

    # ====================================================================
    # Education (1)
    # ====================================================================
    {
        "id": "inst-54",
        "name": "School District of Philadelphia",
        "category": "education",
        "address": "440 N Broad St, Philadelphia, PA 19130",
        "phone": "215-400-4000",
        "coordinates": [-75.1627, 39.9600],
        "description": "Public school system serving Philadelphia",
        "website": "https://www.philasd.org/",
        "officeholder": None,
        "district": None,
    },

    # ====================================================================
    # Police Districts (22)
    # ====================================================================
    {
        "id": "inst-55",
        "name": "1st Police District",
        "category": "police",
        "address": "24th & Wolf St, Philadelphia, PA 19145",
        "phone": "215-686-3010",
        "coordinates": [-75.1870, 39.9290],
        "description": "Philadelphia Police 1st District covering South Philadelphia",
        "website": "https://www.phillypolice.com/districts/1st-district/",
        "officeholder": None,
        "district": "1",
    },
    {
        "id": "inst-56",
        "name": "2nd Police District",
        "category": "police",
        "address": "7306 Castor Ave, Philadelphia, PA 19152",
        "phone": "215-686-3020",
        "coordinates": [-75.0820, 40.0550],
        "description": "Philadelphia Police 2nd District covering Northeast Philadelphia",
        "website": "https://www.phillypolice.com/districts/2nd-district/",
        "officeholder": None,
        "district": "2",
    },
    {
        "id": "inst-57",
        "name": "3rd Police District",
        "category": "police",
        "address": "11th & Wharton St, Philadelphia, PA 19147",
        "phone": "215-686-3030",
        "coordinates": [-75.1570, 39.9350],
        "description": "Philadelphia Police 3rd District covering parts of South Philadelphia",
        "website": "https://www.phillypolice.com/districts/3rd-district/",
        "officeholder": None,
        "district": "3",
    },
    {
        "id": "inst-58",
        "name": "4th Police District",
        "category": "police",
        "address": "3400 Civic Center Blvd, Philadelphia, PA 19104",
        "phone": "215-686-3040",
        "coordinates": [-75.1960, 39.9480],
        "description": "Philadelphia Police 4th District covering West Philadelphia",
        "website": "https://www.phillypolice.com/districts/4th-district/",
        "officeholder": None,
        "district": "4",
    },
    {
        "id": "inst-59",
        "name": "5th Police District",
        "category": "police",
        "address": "Ridge Ave & Cinnaminson St, Philadelphia, PA 19128",
        "phone": "215-686-3050",
        "coordinates": [-75.1940, 39.9740],
        "description": "Philadelphia Police 5th District covering Roxborough/Manayunk",
        "website": "https://www.phillypolice.com/districts/5th-district/",
        "officeholder": None,
        "district": "5",
    },
    {
        "id": "inst-60",
        "name": "6th Police District",
        "category": "police",
        "address": "235 N 11th St, Philadelphia, PA 19107",
        "phone": "215-686-3060",
        "coordinates": [-75.1572, 39.9561],
        "description": "Philadelphia Police 6th District covering Center City",
        "website": "https://www.phillypolice.com/districts/6th-district/",
        "officeholder": None,
        "district": "6",
    },
    {
        "id": "inst-61",
        "name": "7th Police District",
        "category": "police",
        "address": "Bustleton & Bowler Sts, Philadelphia, PA 19115",
        "phone": "215-686-3070",
        "coordinates": [-75.0650, 40.0600],
        "description": "Philadelphia Police 7th District covering Far Northeast",
        "website": "https://www.phillypolice.com/districts/7th-district/",
        "officeholder": None,
        "district": "7",
    },
    {
        "id": "inst-62",
        "name": "8th Police District",
        "category": "police",
        "address": "Red Lion & Academy Rds, Philadelphia, PA 19154",
        "phone": "215-686-3080",
        "coordinates": [-75.0280, 40.0800],
        "description": "Philadelphia Police 8th District covering Far Northeast",
        "website": "https://www.phillypolice.com/districts/8th-district/",
        "officeholder": None,
        "district": "8",
    },
    {
        "id": "inst-63",
        "name": "9th Police District",
        "category": "police",
        "address": "401 N 21st St, Philadelphia, PA 19130",
        "phone": "215-686-3090",
        "coordinates": [-75.1760, 39.9590],
        "description": "Philadelphia Police 9th District covering Fairmount/Spring Garden",
        "website": "https://www.phillypolice.com/districts/9th-district/",
        "officeholder": None,
        "district": "9",
    },
    {
        "id": "inst-64",
        "name": "12th Police District",
        "category": "police",
        "address": "6448 Woodland Ave, Philadelphia, PA 19142",
        "phone": "215-686-3120",
        "coordinates": [-75.2400, 39.9290],
        "description": "Philadelphia Police 12th District covering Southwest Philadelphia",
        "website": "https://www.phillypolice.com/districts/12th-district/",
        "officeholder": None,
        "district": "12",
    },
    {
        "id": "inst-65",
        "name": "14th Police District",
        "category": "police",
        "address": "43 W Haines St, Philadelphia, PA 19144",
        "phone": "215-686-3140",
        "coordinates": [-75.1680, 40.0370],
        "description": "Philadelphia Police 14th District covering Germantown",
        "website": "https://www.phillypolice.com/districts/14th-district/",
        "officeholder": None,
        "district": "14",
    },
    {
        "id": "inst-66",
        "name": "15th Police District",
        "category": "police",
        "address": "Harbison & Levick Sts, Philadelphia, PA 19149",
        "phone": "215-686-3150",
        "coordinates": [-75.0790, 40.0380],
        "description": "Philadelphia Police 15th District covering Northeast Philadelphia",
        "website": "https://www.phillypolice.com/districts/15th-district/",
        "officeholder": None,
        "district": "15",
    },
    {
        "id": "inst-67",
        "name": "16th Police District",
        "category": "police",
        "address": "39th & Lancaster Ave, Philadelphia, PA 19104",
        "phone": "215-686-3160",
        "coordinates": [-75.1960, 39.9670],
        "description": "Philadelphia Police 16th District covering West Philadelphia",
        "website": "https://www.phillypolice.com/districts/16th-district/",
        "officeholder": None,
        "district": "16",
    },
    {
        "id": "inst-68",
        "name": "17th Police District",
        "category": "police",
        "address": "20th & Federal Sts, Philadelphia, PA 19146",
        "phone": "215-686-3170",
        "coordinates": [-75.1720, 39.9380],
        "description": "Philadelphia Police 17th District covering Point Breeze/Grays Ferry",
        "website": "https://www.phillypolice.com/districts/17th-district/",
        "officeholder": None,
        "district": "17",
    },
    {
        "id": "inst-69",
        "name": "18th Police District",
        "category": "police",
        "address": "55th & Pine Sts, Philadelphia, PA 19143",
        "phone": "215-686-3180",
        "coordinates": [-75.2280, 39.9540],
        "description": "Philadelphia Police 18th District covering West Philadelphia",
        "website": "https://www.phillypolice.com/districts/18th-district/",
        "officeholder": None,
        "district": "18",
    },
    {
        "id": "inst-70",
        "name": "19th Police District",
        "category": "police",
        "address": "61st & Thompson Sts, Philadelphia, PA 19151",
        "phone": "215-686-3190",
        "coordinates": [-75.2430, 39.9680],
        "description": "Philadelphia Police 19th District covering Overbrook/Wynnefield",
        "website": "https://www.phillypolice.com/districts/19th-district/",
        "officeholder": None,
        "district": "19",
    },
    {
        "id": "inst-71",
        "name": "22nd Police District",
        "category": "police",
        "address": "17th & Montgomery Ave, Philadelphia, PA 19121",
        "phone": "215-686-3220",
        "coordinates": [-75.1640, 39.9780],
        "description": "Philadelphia Police 22nd District covering North Philadelphia",
        "website": "https://www.phillypolice.com/districts/22nd-district/",
        "officeholder": None,
        "district": "22",
    },
    {
        "id": "inst-72",
        "name": "24th Police District",
        "category": "police",
        "address": "3901 Whitaker Ave, Philadelphia, PA 19124",
        "phone": "215-686-3240",
        "coordinates": [-75.1140, 40.0270],
        "description": "Philadelphia Police 24th District covering Frankford/Juniata",
        "website": "https://www.phillypolice.com/districts/24th-district/",
        "officeholder": None,
        "district": "24",
    },
    {
        "id": "inst-73",
        "name": "25th Police District",
        "category": "police",
        "address": "3901 Whitaker Ave, Philadelphia, PA 19124",
        "phone": "215-686-3250",
        "coordinates": [-75.1360, 39.9900],
        "description": "Philadelphia Police 25th District covering Kensington/Fairhill",
        "website": "https://www.phillypolice.com/districts/25th-district/",
        "officeholder": None,
        "district": "25",
    },
    {
        "id": "inst-74",
        "name": "26th Police District",
        "category": "police",
        "address": "615 E Girard Ave, Philadelphia, PA 19125",
        "phone": "215-686-3260",
        "coordinates": [-75.1300, 39.9720],
        "description": "Philadelphia Police 26th District covering Fishtown/Port Richmond",
        "website": "https://www.phillypolice.com/districts/26th-district/",
        "officeholder": None,
        "district": "26",
    },
    {
        "id": "inst-75",
        "name": "35th Police District",
        "category": "police",
        "address": "5932 N Broad St, Philadelphia, PA 19141",
        "phone": "215-686-3350",
        "coordinates": [-75.1540, 40.0450],
        "description": "Philadelphia Police 35th District covering Olney/Oak Lane",
        "website": "https://www.phillypolice.com/districts/35th-district/",
        "officeholder": None,
        "district": "35",
    },
    {
        "id": "inst-76",
        "name": "39th Police District",
        "category": "police",
        "address": "22nd & Hunting Park Ave, Philadelphia, PA 19140",
        "phone": "215-686-3390",
        "coordinates": [-75.1760, 40.0080],
        "description": "Philadelphia Police 39th District covering Nicetown/Hunting Park",
        "website": "https://www.phillypolice.com/districts/39th-district/",
        "officeholder": None,
        "district": "39",
    },

    # ====================================================================
    # Community -- Free Library of Philadelphia system (19)
    # ====================================================================
    {
        "id": "inst-77",
        "name": "Free Library of Philadelphia (Parkway Central)",
        "category": "community",
        "address": "1901 Vine St, Philadelphia, PA 19103",
        "phone": "215-686-5300",
        "coordinates": [-75.1710, 39.9610],
        "description": "Main branch of the Free Library of Philadelphia system",
        "website": "https://www.freelibrary.org/",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-78",
        "name": "Northeast Regional Library",
        "category": "community",
        "address": "2228 Cottman Ave, Philadelphia, PA 19149",
        "phone": "215-685-0522",
        "coordinates": [-75.0540, 40.0490],
        "description": "Free Library regional branch serving Northeast Philadelphia",
        "website": "https://www.freelibrary.org/locations/northeast-regional-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-79",
        "name": "Joseph E. Coleman NW Regional Library",
        "category": "community",
        "address": "68 W Chelten Ave, Philadelphia, PA 19144",
        "phone": "215-685-2150",
        "coordinates": [-75.1900, 40.0550],
        "description": "Free Library regional branch serving Northwest Philadelphia",
        "website": "https://www.freelibrary.org/locations/joseph-e-coleman-northwest-regional-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-80",
        "name": "Lucien E. Blackwell West Philadelphia Regional Library",
        "category": "community",
        "address": "125 S 52nd St, Philadelphia, PA 19139",
        "phone": "215-685-7424",
        "coordinates": [-75.2050, 39.9570],
        "description": "Free Library regional branch serving West Philadelphia",
        "website": "https://www.freelibrary.org/locations/lucien-e-blackwell-west-philadelphia-regional-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-81",
        "name": "Independence Branch Library",
        "category": "community",
        "address": "18 S 7th St, Philadelphia, PA 19106",
        "phone": "215-685-1633",
        "coordinates": [-75.1490, 39.9490],
        "description": "Free Library branch near Independence Hall in Old City",
        "website": "https://www.freelibrary.org/locations/independence-branch",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-82",
        "name": "Thomas F. Donatucci Sr. Library",
        "category": "community",
        "address": "1935 Shunk St, Philadelphia, PA 19145",
        "phone": "215-685-1755",
        "coordinates": [-75.1720, 39.9200],
        "description": "Free Library branch serving South Philadelphia",
        "website": "https://www.freelibrary.org/locations/thomas-f-donatucci-sr-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-83",
        "name": "Frankford Branch Library",
        "category": "community",
        "address": "4634 Frankford Ave, Philadelphia, PA 19124",
        "phone": "215-685-1473",
        "coordinates": [-75.0770, 40.0210],
        "description": "Free Library branch serving Frankford neighborhood",
        "website": "https://www.freelibrary.org/locations/frankford-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-84",
        "name": "Cecil B. Moore Library",
        "category": "community",
        "address": "2320 W Cecil B. Moore Ave, Philadelphia, PA 19121",
        "phone": "215-685-2766",
        "coordinates": [-75.1620, 39.9800],
        "description": "Free Library branch serving North Broad Street area",
        "website": "https://www.freelibrary.org/locations/cecil-b-moore-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-85",
        "name": "Chestnut Hill Library",
        "category": "community",
        "address": "8711 Germantown Ave, Philadelphia, PA 19118",
        "phone": "215-685-9290",
        "coordinates": [-75.1930, 40.0740],
        "description": "Free Library branch serving Chestnut Hill neighborhood",
        "website": "https://www.freelibrary.org/locations/chestnut-hill-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-86",
        "name": "Cobbs Creek Library",
        "category": "community",
        "address": "5800 Cobbs Creek Pkwy, Philadelphia, PA 19143",
        "phone": "215-685-1973",
        "coordinates": [-75.2350, 39.9520],
        "description": "Free Library branch serving Cobbs Creek neighborhood",
        "website": "https://www.freelibrary.org/locations/cobbs-creek-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-87",
        "name": "Falls of Schuylkill Library",
        "category": "community",
        "address": "3501 Midvale Ave, Philadelphia, PA 19129",
        "phone": "215-685-2093",
        "coordinates": [-75.2010, 40.0190],
        "description": "Free Library branch serving East Falls neighborhood",
        "website": "https://www.freelibrary.org/locations/falls-of-schuylkill-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-88",
        "name": "Fishtown Community Library",
        "category": "community",
        "address": "1217 E Montgomery Ave, Philadelphia, PA 19125",
        "phone": "215-685-9996",
        "coordinates": [-75.1270, 39.9720],
        "description": "Free Library branch serving Fishtown neighborhood",
        "website": "https://www.freelibrary.org/locations/fishtown-community-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-89",
        "name": "Fox Chase Library",
        "category": "community",
        "address": "501 Rhawn St, Philadelphia, PA 19111",
        "phone": "215-685-0547",
        "coordinates": [-75.0810, 40.0580],
        "description": "Free Library branch serving Fox Chase neighborhood",
        "website": "https://www.freelibrary.org/locations/fox-chase-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-90",
        "name": "Greater Olney Library",
        "category": "community",
        "address": "5501 N 5th St, Philadelphia, PA 19120",
        "phone": "215-685-2848",
        "coordinates": [-75.1280, 40.0350],
        "description": "Free Library branch serving Greater Olney neighborhood",
        "website": "https://www.freelibrary.org/locations/greater-olney-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-91",
        "name": "Haverford Library",
        "category": "community",
        "address": "5543 Haverford Ave, Philadelphia, PA 19139",
        "phone": "215-685-1964",
        "coordinates": [-75.2220, 39.9620],
        "description": "Free Library branch serving Haverford/Parkside neighborhood",
        "website": "https://www.freelibrary.org/locations/haverford-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-92",
        "name": "Holmesburg Library",
        "category": "community",
        "address": "7810 Frankford Ave, Philadelphia, PA 19136",
        "phone": "215-685-8756",
        "coordinates": [-75.0600, 40.0370],
        "description": "Free Library branch serving Holmesburg neighborhood",
        "website": "https://www.freelibrary.org/locations/holmesburg-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-93",
        "name": "McPherson Square Library",
        "category": "community",
        "address": "601 E Indiana Ave, Philadelphia, PA 19134",
        "phone": "215-685-9995",
        "coordinates": [-75.1300, 39.9880],
        "description": "Free Library branch serving Kensington neighborhood",
        "website": "https://www.freelibrary.org/locations/mcpherson-square-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-94",
        "name": "Nicetown-Tioga Library",
        "category": "community",
        "address": "3720 N Broad St, Philadelphia, PA 19140",
        "phone": "215-685-9790",
        "coordinates": [-75.1580, 40.0100],
        "description": "Free Library branch serving Nicetown-Tioga neighborhood",
        "website": "https://www.freelibrary.org/locations/nicetown-tioga-library",
        "officeholder": None,
        "district": None,
    },
    {
        "id": "inst-95",
        "name": "South Philadelphia Library",
        "category": "community",
        "address": "2301 S Broad St, Philadelphia, PA 19148",
        "phone": "215-685-1866",
        "coordinates": [-75.1640, 39.9300],
        "description": "Free Library branch serving South Philadelphia",
        "website": "https://www.freelibrary.org/locations/south-philadelphia-library",
        "officeholder": None,
        "district": None,
    },
]

assert len(institutions) == 95, f"Expected 95 institutions, got {len(institutions)}"

# Build lookup
_inst_by_id: dict[str, dict] = {inst["id"]: inst for inst in institutions}

# ---------------------------------------------------------------------------
# Contact-weight mapping -- institution_id -> approximate target count
# Total target: ~2000
# ---------------------------------------------------------------------------
_CONTACT_WEIGHTS: dict[str, int] = {
    # City Government (18)
    "inst-1": 25,    # Mayor's Office
    "inst-2": 120,   # Water Department
    "inst-3": 100,   # Streets Department
    "inst-4": 80,    # L&I
    "inst-5": 20,    # Revenue
    "inst-6": 20,    # Public Health
    "inst-7": 25,    # Police HQ
    "inst-8": 180,   # Philly311
    "inst-9": 15,    # OPA
    "inst-10": 15,   # Parks & Rec
    "inst-11": 15,   # Homeless Services
    "inst-12": 15,   # Managing Director
    "inst-13": 15,   # Commerce
    "inst-14": 20,   # Human Services
    "inst-15": 20,   # Fire Department
    "inst-16": 25,   # District Attorney
    "inst-17": 15,   # City Controller
    "inst-18": 15,   # Sheriff

    # City Council (17) -- 20-30 each
    "inst-19": 25,   # Squilla D1
    "inst-20": 30,   # Johnson D2 (Council President)
    "inst-21": 25,   # Gauthier D3
    "inst-22": 22,   # Jones D4
    "inst-23": 22,   # Young D5
    "inst-24": 22,   # Driscoll D6
    "inst-25": 22,   # Lozada D7
    "inst-26": 22,   # Bass D8
    "inst-27": 20,   # Phillips D9
    "inst-28": 20,   # O'Neill D10
    "inst-29": 28,   # Gilmore Richardson At-Large
    "inst-30": 25,   # Isaiah Thomas At-Large
    "inst-31": 20,   # Harrity At-Large
    "inst-32": 20,   # Ahmad At-Large
    "inst-33": 20,   # Landau At-Large
    "inst-34": 22,   # Brooks At-Large
    "inst-35": 20,   # O'Rourke At-Large

    # US Congress (5) -- 8-12 each
    "inst-36": 10,   # Fetterman
    "inst-37": 8,    # McCormick
    "inst-38": 12,   # Boyle
    "inst-39": 12,   # Evans
    "inst-40": 8,    # Scanlon

    # PA State Senate (7) -- 10-15 each
    "inst-41": 15,   # Saval
    "inst-42": 12,   # Tartaglione
    "inst-43": 12,   # Street
    "inst-44": 12,   # Haywood
    "inst-45": 10,   # Dillon
    "inst-46": 12,   # Hughes
    "inst-47": 10,   # Williams

    # PA State House (6) -- 10-12 each
    "inst-48": 10,   # Hohenstein
    "inst-49": 12,   # Kenyatta
    "inst-50": 10,   # Harris
    "inst-51": 12,   # Krajewski
    "inst-52": 10,   # Green
    "inst-53": 10,   # McClinton

    # Education (1)
    "inst-54": 40,   # School District

    # Police Districts (22) -- 25-45 each
    "inst-55": 30,   # 1st
    "inst-56": 28,   # 2nd
    "inst-57": 30,   # 3rd
    "inst-58": 28,   # 4th
    "inst-59": 25,   # 5th
    "inst-60": 30,   # 6th
    "inst-61": 25,   # 7th
    "inst-62": 25,   # 8th
    "inst-63": 28,   # 9th
    "inst-64": 35,   # 12th
    "inst-65": 30,   # 14th
    "inst-66": 25,   # 15th
    "inst-67": 30,   # 16th
    "inst-68": 28,   # 17th
    "inst-69": 28,   # 18th
    "inst-70": 28,   # 19th
    "inst-71": 40,   # 22nd
    "inst-72": 30,   # 24th
    "inst-73": 45,   # 25th
    "inst-74": 30,   # 26th
    "inst-75": 30,   # 35th
    "inst-76": 42,   # 39th

    # Community / Libraries (19) -- 5-10 each
    "inst-77": 10,   # Parkway Central (main)
    "inst-78": 8,    # Northeast Regional
    "inst-79": 8,    # Coleman NW Regional
    "inst-80": 8,    # Blackwell W Phila Regional
    "inst-81": 7,    # Independence
    "inst-82": 7,    # Donatucci
    "inst-83": 6,    # Frankford
    "inst-84": 6,    # Cecil B. Moore
    "inst-85": 5,    # Chestnut Hill
    "inst-86": 6,    # Cobbs Creek
    "inst-87": 5,    # Falls of Schuylkill
    "inst-88": 7,    # Fishtown
    "inst-89": 5,    # Fox Chase
    "inst-90": 6,    # Greater Olney
    "inst-91": 5,    # Haverford
    "inst-92": 5,    # Holmesburg
    "inst-93": 7,    # McPherson Square
    "inst-94": 6,    # Nicetown-Tioga
    "inst-95": 6,    # South Philadelphia
}

# ---------------------------------------------------------------------------
# Sample summaries per issue category (5-8 templates each)
# ---------------------------------------------------------------------------

_SAMPLE_SUMMARIES: dict[str, list[str]] = {
    "abandoned-vehicles": [
        "Abandoned car on my block for 3+ months",
        "Unregistered vehicle blocking street cleaning",
        "Car with flat tires hasn't moved since last year",
        "Abandoned truck parked in front of fire hydrant",
        "Multiple abandoned cars on our street need removal",
        "Vehicle with expired tags sitting in same spot for weeks",
        "Old sedan abandoned with broken windows on our block",
        "Tow request for car abandoned after accident",
    ],
    "illegal-dumping": [
        "Construction debris dumped on vacant lot",
        "Mattresses left on sidewalk near 52nd & Market",
        "Someone dumping tires in the alley behind my house",
        "Bulk trash illegally dumped after collection day",
        "Electronics and appliances dumped on corner",
        "Repeated dumping of household waste at dead-end street",
        "Bags of trash dumped next to recycling bin overnight",
    ],
    "infrastructure": [
        "Pothole on my block hasn't been fixed in 3 months",
        "Broken traffic light at major intersection",
        "Street flooding every time it rains",
        "Sidewalk crumbling and unsafe for pedestrians",
        "Streetlight has been out for weeks",
        "Road needs repaving -- full of cracks",
        "Storm drain completely blocked with debris",
        "Missing stop sign at dangerous corner",
    ],
    "graffiti": [
        "Tags on property fence facing the street",
        "Graffiti on school wall needs removal",
        "Spray paint on bus shelter and benches",
        "Vandalism on bridge overpass visible from highway",
        "Graffiti on utility boxes along main corridor",
        "Tags covering mural wall in the neighborhood",
    ],
    "housing": [
        "Landlord refusing to make necessary repairs",
        "Vacant property attracting illegal dumping",
        "Need information about housing assistance programs",
        "Building code violations in my apartment",
        "Neighbor's property is abandoned and hazardous",
        "Lead paint concerns in rental unit",
        "Rent increase seems unlawful under city guidelines",
    ],
    "safety": [
        "Need increased police patrols on my street",
        "Noise complaints about late-night construction",
        "Drug activity at nearby intersection",
        "Need better street lighting for safety",
        "Speeding vehicles on residential street endangering kids",
        "Concerns about open-air drug market near school",
    ],
    "vacant-lots": [
        "Overgrown vacant lot attracting rats",
        "Dumping on empty lot next door to my home",
        "Vacant lot being used as illegal parking",
        "Weeds and trash in city-owned vacant lot",
        "Request for lot cleanup -- hazardous conditions",
        "Vacant lot fence is broken and kids are getting in",
    ],
    "permits": [
        "Neighbor doing major construction without permits",
        "Noise from unpermitted work at all hours",
        "Commercial business operating without zoning approval",
        "Sidewalk cafe blocking pedestrian path without permit",
        "Construction dumpster on street with no permit",
        "Need info on permit requirements for home renovation",
    ],
    "utilities": [
        "Water bill seems abnormally high",
        "Hydrant leaking for over a week",
        "Sewer backup in basement after every storm",
        "Requesting water service line inspection",
        "Gas leak smell near utility box",
        "Need help with water bill payment plan",
        "Water main break flooding the street",
    ],
    "other": [
        "Need information about city services",
        "Requesting community meeting with officials",
        "Trash collection missed on scheduled day",
        "Need help navigating city permit process",
        "Tree trimming needed -- branches blocking power lines",
        "Requesting information about property tax freeze program",
        "Stray cats colony growing in the neighborhood",
        "Noise complaint about commercial establishment",
    ],
}

# ---------------------------------------------------------------------------
# Generate ~2000 contact records
# ---------------------------------------------------------------------------

contacts: list[dict] = []

for inst_id, count in _CONTACT_WEIGHTS.items():
    for _ in range(count):
        cat = random.choices(_ISSUE_CATEGORIES, weights=_ISSUE_WEIGHTS, k=1)[0]
        contacts.append({
            "id": _next_id("contact-"),
            "institution_id": inst_id,
            "issue_category": cat,
            "summary": random.choice(_SAMPLE_SUMMARIES[cat]),
            "created_at": _random_iso_date(_SIX_MONTHS_AGO, _NOW),
            "zip_code": random.choice(_PHILLY_ZIPS),
        })

# ---------------------------------------------------------------------------
# Resolution rates by institution category
# ---------------------------------------------------------------------------
_RESOLUTION_RATES: dict[str, float] = {
    "city-government": 0.40,
    "city-council": 0.30,
    "us-congress": 0.20,
    "pa-state-senate": 0.25,
    "pa-state-house": 0.22,
    "education": 0.30,
    "police": 0.35,
    "community": 0.55,
}

# Override for 311 specifically
_RESOLUTION_RATE_OVERRIDES: dict[str, float] = {
    "inst-8": 0.60,  # Philly311 has higher resolution rate
}

# ---------------------------------------------------------------------------
# Generate ~1500 resolution records
# ---------------------------------------------------------------------------

resolutions: list[dict] = []

# Randomly select ~1500 contacts to have resolutions
_contacts_with_resolutions = random.sample(contacts, min(1500, len(contacts)))

_USER_COMMENTS = [
    "Issue was resolved quickly, thank you!",
    "Took a while but finally got a response",
    "Still waiting for follow-up",
    "Partial fix -- needs more attention",
    "Very satisfied with the outcome",
    "No response after multiple attempts",
    "Representative was very helpful",
    "Problem came back after initial fix",
    "Referred to another department",
    "Received a form letter response",
    "",
]

for contact in _contacts_with_resolutions:
    inst = _inst_by_id[contact["institution_id"]]
    rate = _RESOLUTION_RATE_OVERRIDES.get(
        contact["institution_id"],
        _RESOLUTION_RATES.get(inst["category"], 0.30),
    )

    roll = random.random()
    if roll < rate:
        status = "resolved"
    elif roll < rate + 0.20:
        status = "in-progress"
    elif roll < rate + 0.35:
        status = "pending"
    else:
        status = "unresolved"

    reported_at = contact["created_at"]
    resolved_at = None
    if status == "resolved":
        # Resolved 1-60 days after reporting
        base = datetime.fromisoformat(reported_at)
        resolved_at = (base + timedelta(days=random.randint(1, 60))).isoformat()

    resolutions.append({
        "id": _next_id("res-"),
        "contact_id": contact["id"],
        "institution_id": contact["institution_id"],
        "status": status,
        "reported_at": reported_at,
        "resolved_at": resolved_at,
        "user_comment": random.choice(_USER_COMMENTS),
    })


# ---------------------------------------------------------------------------
# Aggregation helper
# ---------------------------------------------------------------------------

def get_institution_stats() -> list[dict]:
    """Compute aggregated stats per institution.

    Returns a list of dicts, one per institution, with fields:
    - institutionId, name, category
    - totalContacts, contactsLast30Days
    - resolvedCount, unresolvedCount, pendingCount, inProgressCount
    - resolutionRate (0.0-1.0)
    - topIssueCategories (list of {category, count} sorted desc)
    """
    thirty_days_ago = (_NOW - timedelta(days=30)).isoformat()

    # Pre-compute per-institution contact counts
    contacts_by_inst: dict[str, list[dict]] = {}
    for c in contacts:
        contacts_by_inst.setdefault(c["institution_id"], []).append(c)

    # Pre-compute per-institution resolution counts
    res_by_inst: dict[str, list[dict]] = {}
    for r in resolutions:
        res_by_inst.setdefault(r["institution_id"], []).append(r)

    stats = []
    for inst in institutions:
        inst_contacts = contacts_by_inst.get(inst["id"], [])
        inst_resolutions = res_by_inst.get(inst["id"], [])

        total = len(inst_contacts)
        last_30 = sum(1 for c in inst_contacts if c["created_at"] >= thirty_days_ago)

        resolved = sum(1 for r in inst_resolutions if r["status"] == "resolved")
        unresolved = sum(1 for r in inst_resolutions if r["status"] == "unresolved")
        pending = sum(1 for r in inst_resolutions if r["status"] == "pending")
        in_progress = sum(1 for r in inst_resolutions if r["status"] == "in-progress")

        total_with_resolution = len(inst_resolutions)
        resolution_rate = round(resolved / total_with_resolution, 3) if total_with_resolution > 0 else 0.0

        # Top issue categories
        cat_counter: Counter[str] = Counter()
        for c in inst_contacts:
            cat_counter[c["issue_category"]] += 1
        top_categories = [{"category": cat, "count": cnt} for cat, cnt in cat_counter.most_common(5)]

        stats.append({
            "institutionId": inst["id"],
            "name": inst["name"],
            "category": inst["category"],
            "totalContacts": total,
            "contactsLast30Days": last_30,
            "resolvedCount": resolved,
            "unresolvedCount": unresolved,
            "pendingCount": pending,
            "inProgressCount": in_progress,
            "resolutionRate": resolution_rate,
            "topIssueCategories": top_categories,
        })

    return stats


# ---------------------------------------------------------------------------
# Category → level mapping for the institution table
# ---------------------------------------------------------------------------
_CATEGORY_TO_LEVEL: dict[str, str] = {
    "city-government": "municipal",
    "city-council": "municipal",
    "us-congress": "us_senate",  # overridden per-institution below
    "pa-state-senate": "state_senate",
    "pa-state-house": "state_house",
    "police": "municipal",
    "community": "municipal",
    "education": "municipal",
}

# US Congress entries that are House reps (not senators)
_US_HOUSE_NAMES = {"Brendan Boyle", "Dwight Evans", "Mary Gay Scanlon"}


def _get_institution_level(inst: dict) -> str:
    """Derive the candidate_level for an institution."""
    cat = inst["category"]
    if cat == "us-congress":
        name = inst.get("officeholder", "")
        if name in _US_HOUSE_NAMES:
            return "us_house"
        return "us_senate"
    return _CATEGORY_TO_LEVEL.get(cat, "municipal")


async def seed_institutions_to_db() -> None:
    """Insert institution records into PostgreSQL if the table is empty."""
    from app.gateway.db import get_pool

    pool = get_pool()
    row = await pool.fetchrow("SELECT count(*) AS cnt FROM institution")
    if row and row["cnt"] > 0:
        return  # already seeded

    async with pool.acquire() as conn:
        for inst in institutions:
            level = _get_institution_level(inst)
            coords = inst.get("coordinates", [])
            await conn.execute(
                """
                INSERT INTO institution (id, name, category, level, address, phone,
                    coordinates, description, website, officeholder, district, state)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (id) DO NOTHING
                """,
                inst["id"],
                inst["name"],
                inst["category"],
                level,
                inst.get("address", ""),
                inst.get("phone", ""),
                coords,
                inst.get("description", ""),
                inst.get("website", ""),
                inst.get("officeholder"),
                inst.get("district"),
                "PA",  # all current institutions are in Pennsylvania
            )

    import logging
    logging.getLogger(__name__).info("Seeded %d institutions into PostgreSQL", len(institutions))
