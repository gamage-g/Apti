// Python Practice Lab — curated notes, exercises, quiz, and resources
// Complements Apti's AI lessons with practical reference material.

export const PYTHON_TIPS = [
  "Code every day, even just 15 minutes.",
  "Read errors bottom-to-top: last line = WHAT, rest = WHERE.",
  "Write comments BEFORE the code, not after.",
  "Use print() liberally while debugging — it's the fastest tool.",
  "When stuck for 20 min, explain the problem out loud.",
  "Tie every concept to an engineering problem you care about.",
  "Type code out — don't copy-paste when learning.",
  "Try help(str.split) in the interpreter to explore any object.",
  "Build something small every week. Tiny projects beat long tutorials.",
  "Read open-source code on GitHub — see how experts write Python.",
];

export const PYTHON_QUIZ = [
  { q: "What does // do in Python?", opts: ["Floor division", "Float division", "Exponent", "Modulo"], a: 0 },
  { q: "Which of these types is immutable?", opts: ["list", "tuple", "dict", "set"], a: 1 },
  { q: "len([1, [2, 3], 4]) returns:", opts: ["4", "3", "5", "Error"], a: 1 },
  { q: "f-strings were introduced in Python:", opts: ["2.7", "3.0", "3.6", "3.10"], a: 2 },
  { q: "bool('') returns:", opts: ["True", "False", "Error", "None"], a: 1 },
  { q: "list(range(0, 10, 3)) returns:", opts: ["[0,3,6,9]", "[0,3,6]", "[3,6,9]", "Error"], a: 0 },
  { q: "Which statement exits a loop immediately?", opts: ["stop", "exit", "break", "return"], a: 2 },
  { q: "*args collects:", opts: ["Keyword arguments", "Positional arguments", "All arguments", "Named arguments"], a: 1 },
  { q: "Dictionary keys must be:", opts: ["Strings", "Integers", "Hashable", "Any type"], a: 2 },
  { q: "try must be followed by:", opts: ["finally", "except", "else", "catch"], a: 1 },
  { q: "NumPy is faster than Python lists because:", opts: ["Better syntax", "Contiguous memory + C code", "More functions", "Newer language"], a: 1 },
  { q: "DataFrame.iloc[0] selects by:", opts: ["Label", "Position", "Value", "Type"], a: 1 },
  { q: "In a class method, self refers to:", opts: ["The class itself", "The instance", "The parent class", "Nothing"], a: 1 },
  { q: "[x**2 for x in range(4)] produces:", opts: ["[0,1,4,9]", "[1,4,9,16]", "[0,2,4,6]", "Error"], a: 0 },
  { q: "np.linspace(0, 1, 5) creates:", opts: ["[0,.2,.4,.6,.8]", "[0,.25,.5,.75,1]", "5 random floats", "Error"], a: 1 },
];

export const PYTHON_PHASES = [
  // ─── Phase 1: Foundations ───────────────────────────────────────────────────
  {
    id: 1,
    title: "Foundations",
    weeks: "Weeks 1–3",
    icon: "⚡",
    accent: "gold",
    description: "Core Python tied to real engineering problems",
    books: [
      { title: "Automate the Boring Stuff with Python", author: "Al Sweigart", note: "Free online — best first book", url: "https://automatetheboringstuff.com" },
      { title: "Python Crash Course (3rd Ed)", author: "Eric Matthes", note: "Structured walkthrough with projects" },
      { title: "Think Python (3rd Ed)", author: "Allen B. Downey", note: "Free — computational thinking approach", url: "https://greenteapress.com/wp/think-python-3rd-edition/" },
    ],
    resources: [
      { name: "Official Python Tutorial", url: "https://docs.python.org/3/tutorial/" },
      { name: "Exercism Python Track", url: "https://exercism.org/tracks/python" },
      { name: "Python Tutor — Code Visualizer", url: "https://pythontutor.com" },
    ],
    modules: [
      {
        id: "1.1",
        title: "Variables, Types & Operators",
        duration: "Days 1–3",
        aptiSkillId: "prog-python-basics",
        notes: [
          {
            title: "What is Python?",
            body: `Python is a programming language — a way to give precise instructions to a computer. Unlike C or Java, Python reads almost like English, which makes it the fastest language to go from "I have an idea" to "I have working code."\n\nYou'll use Python throughout your engineering career to automate calculations, analyse data, simulate systems, and build tools. Every concept in this lab connects directly to real engineering work.`,
          },
          {
            title: "Variables: Giving Names to Values",
            body: "A variable is a label you attach to a piece of data. Think of it like labelling a wire in a circuit — the wire carries the signal, the label helps you identify it.",
            code: `# Creating variables — just use the = sign
voltage = 230        # an integer (whole number)
current = 5.0        # a float (decimal number)
unit = "Volts"       # a string (text)
is_stable = True     # a boolean (True or False)

# Python figures out the type automatically
print(voltage)       # Output: 230
print(type(voltage)) # Output: <class 'int'>`,
            afterCode: "You don't need to declare the type (unlike C where you'd write `int voltage = 230;`). Python infers it — this is called dynamic typing.",
          },
          {
            title: "The Four Core Types",
            body: "Everything in Python has a type. The four you'll use constantly:",
            code: `# int — whole numbers (voltage counts, indices)
resistance = 46
num_phases = 3

# float — decimal numbers (measurements, calculations)
power_factor = 0.85
frequency = 50.0

# str — text (labels, names, messages)
feeder_name = "IJK-11kV-F1"
status = 'active'    # single or double quotes both work

# bool — True or False (conditions, flags)
is_overloaded = False
has_supply = True

# Check any type with type()
print(type(resistance))    # <class 'int'>
print(type(power_factor))  # <class 'float'>
print(type(feeder_name))   # <class 'str'>
print(type(is_overloaded)) # <class 'bool'>`,
            afterCode: "In engineering: int for counts/indices, float for measurements, str for labels/reports, bool for status flags.",
          },
          {
            title: "Type Conversion",
            body: "Sometimes you need to convert between types. Python gives you built-in functions for this:",
            code: `# String to number (e.g., reading from a file or sensor)
reading_str = "228.5"
reading_float = float(reading_str)  # 228.5
reading_int = int(reading_float)    # 228 (truncates, doesn't round!)

# Number to string (for display / reports)
power = 1150
message = "Power is " + str(power) + " W"
print(message)  # Power is 1150 W

# Be careful — these cause errors:
# int("hello")  → ValueError: invalid literal
# int("22.5")   → ValueError (can't go str→int with decimal)
# Fix: int(float("22.5")) → 22`,
          },
          {
            title: "Arithmetic Operators",
            body: "Python is your calculator. Here are all the math operators you need:",
            code: `v = 230   # Voltage
r = 46    # Resistance

print(v + r)    # 276  — Addition
print(v - r)    # 184  — Subtraction
print(v * 2)    # 460  — Multiplication
print(v / r)    # 5.0  — Division (always returns float!)

# Three especially useful operators:
print(v // r)   # 5    — Floor division (drops decimal)
print(v % r)    # 0    — Modulo (remainder after division)
print(v ** 2)   # 52900 — Exponentiation (v squared)

# Real engineering example: Power calculation
current = v / r              # I = V/R = 5.0 A
power = current ** 2 * r     # P = I²R = 1150.0 W
energy = power * 5 / 1000    # E = Pt = 5.75 kWh
print(f"P = {power} W, E = {energy} kWh")`,
            afterCode: "// and % are incredibly useful. Check if even: n % 2 == 0. Convert seconds to minutes: minutes = seconds // 60.",
          },
          {
            title: "Strings and f-strings",
            body: "Strings hold text. The most important feature is f-strings — they let you embed variables directly inside text, with full formatting control:",
            code: `voltage = 228.5
current = 4.2

# f-strings — put f before the quote, use {variable} inside
print(f"Reading: {voltage}V at {current}A")
# Output: Reading: 228.5V at 4.2A

# Math inside the braces
print(f"Power: {voltage * current:.1f} W")
# :.1f = 1 decimal place, float format → 959.7 W

# More formatting tricks
print(f"Voltage: {voltage:>10.2f} V")  # right-aligned, 10 wide
print(f"Percentage: {0.85:.0%}")       # Output: 85%

# Useful string methods
status = "  ACTIVE  "
print(status.strip())           # "ACTIVE"
feeder = "IJK-11kV-F1"
print(feeder.split("-"))        # ['IJK', '11kV', 'F1']
print(feeder.lower())           # 'ijk-11kv-f1'`,
          },
          {
            title: "print() and type() — Your First Tools",
            body: "These two functions will be your constant companions while learning. Use them freely — there's no such thing as too many print statements while debugging.",
            code: `# print() — displays output
print("Hello, Python!")
print(42)
print(3.14, "is pi")    # prints multiple values separated by space

# Printing with context
v, i, r = 230, 5, 46
print(f"V={v}, I={i}, R={r}")

# type() — tells you what kind of data something is
print(type(42))        # <class 'int'>
print(type(3.14))      # <class 'float'>
print(type("hello"))   # <class 'str'>
print(type(True))      # <class 'bool'>

# Incredibly useful for debugging:
result = 230 / 46
print(type(result))    # <class 'float'> — division always gives float!`,
            afterCode: "When your code doesn't work, add print() statements to check what each variable contains and what type it is. Simplest and most effective debugging technique.",
          },
        ],
        exercises: [
          {
            title: "Ohm's Law Calculator",
            difficulty: "Starter",
            description: "Calculate current, power, and energy dissipated in a resistor. Use f-strings to format the output.",
            starter: `# Ohm's Law Calculator
voltage = 230  # Volts
resistance = 46  # Ohms

# TODO: Calculate current (I = V/R)
# TODO: Calculate power (P = I²R)
# TODO: Calculate energy in 5 hours (kWh)
# TODO: Print results using f-strings`,
            solution: `voltage = 230
resistance = 46
time_hours = 5

current = voltage / resistance
power = current ** 2 * resistance
energy_kwh = power * time_hours / 1000

print(f"Current: {current} A")
print(f"Power: {power} W")
print(f"Energy ({time_hours} hrs): {energy_kwh} kWh")`,
          },
          {
            title: "Unit Converter",
            difficulty: "Starter",
            description: "Convert between engineering units: Watts→kW, Degrees→Radians, °C→°F, Joules→kWh.",
            starter: `import math

# TODO: Convert 1500 watts to kilowatts
# TODO: Convert 45 degrees to radians (hint: math.pi)
# TODO: Convert 37°C to Fahrenheit
# TODO: Convert 3600 Joules to kWh`,
            solution: `import math

watts = 1500
print(f"{watts} W = {watts/1000} kW")

deg = 45
print(f"{deg}° = {deg * math.pi / 180:.4f} rad")

c = 37
print(f"{c}°C = {c * 9/5 + 32}°F")

j = 3600
print(f"{j} J = {j / 3_600_000:.6f} kWh")`,
          },
          {
            title: "Wire Resistance Calculator",
            difficulty: "Challenge",
            description: "Calculate resistance R = ρL/A and voltage drop at 10A for three copper wire cross-sections.",
            starter: `rho = 1.68e-8  # copper resistivity (Ohm·m)
length = 100   # metres
gauges = {"1.5mm²": 1.5e-6, "2.5mm²": 2.5e-6, "4.0mm²": 4.0e-6}

# TODO: For each gauge, compute R = rho * length / area
# TODO: Compute voltage drop at 10 A
# TODO: Print results neatly`,
            solution: `rho = 1.68e-8
length = 100
gauges = {"1.5mm²": 1.5e-6, "2.5mm²": 2.5e-6, "4.0mm²": 4.0e-6}
for g, a in gauges.items():
    R = rho * length / a
    vdrop = 10 * R
    print(f"{g}: R={R:.4f} Ω, Vdrop={vdrop:.2f} V")`,
          },
        ],
      },
      {
        id: "1.2",
        title: "Control Flow",
        duration: "Days 4–7",
        aptiSkillId: "prog-python-basics",
        notes: [
          {
            title: "Why Control Flow Matters",
            body: "So far, your code runs line by line, top to bottom. Control flow lets you make decisions and repeat actions — this is where programming becomes truly powerful.\n\nImagine checking 10,000 voltage readings for anomalies. Without control flow, you'd need 10,000 lines of code. With a loop and a condition, you need about 5 lines.",
          },
          {
            title: "if / elif / else — Making Decisions",
            body: "The if statement runs code only when a condition is True. Think of it as a relay: if the signal is high, the circuit activates.",
            code: `voltage = 245

# if-elif-else: multiple conditions (checked in order, first match wins)
if voltage < 207:
    print("Under-voltage")
    status = "LOW"
elif voltage <= 253:
    print("Normal range")
    status = "OK"
else:
    print("Over-voltage!")
    status = "HIGH"

print(f"Status: {status}")  # Status: OK`,
            afterCode: "CRITICAL: Python uses indentation (4 spaces) to define code blocks. This is not optional — it's how Python knows which code belongs inside the if. Always use 4 spaces.",
          },
          {
            title: "for Loops — Repeating Over a Sequence",
            body: "A for loop runs a block of code once for each item in a sequence. It's your automated test equipment — it processes every item systematically.",
            code: `readings = [228, 235, 260, 198, 245, 210]

for voltage in readings:
    if voltage < 207:
        print(f"{voltage}V — Under-voltage")
    elif voltage > 253:
        print(f"{voltage}V — Over-voltage")
    else:
        print(f"{voltage}V — Normal")

# The variable 'voltage' takes each value in turn:
# First loop: voltage=228
# Second loop: voltage=235  ... and so on`,
            afterCode: "The variable name after 'for' is your choice. Use descriptive names: 'for voltage in readings', 'for feeder in feeder_list', 'for hour in range(24)'.",
          },
          {
            title: "range() — Generating Numbers",
            body: "range() creates sequences of numbers — the most common companion to for loops:",
            code: `# range(stop) — 0 to stop-1
for i in range(5):
    print(i)    # 0, 1, 2, 3, 4

# range(start, stop) — start to stop-1
for hour in range(6, 12):
    print(f"{hour}:00")  # 6:00, 7:00, ... 11:00

# range(start, stop, step)
for hour in range(0, 24, 6):
    print(f"{hour}:00")  # 0:00, 6:00, 12:00, 18:00

# Practical: resistance for different wire lengths
rho = 1.68e-8
area = 2.5e-6
for length in range(50, 301, 50):
    R = rho * length / area
    print(f"L={length}m → R={R:.4f} Ω")`,
          },
          {
            title: "while Loops",
            body: "A while loop keeps running as long as its condition is True. Use it when you don't know how many iterations you need.",
            code: `# Practical: Generator payback period
cost = 5_000_000      # ₦5 million capital cost
annual_savings = 800_000
maintenance = 150_000
years = 0

while cost > 0:
    cost -= (annual_savings - maintenance)
    years += 1

print(f"Payback period: {years} years")`,
            afterCode: "WARNING: A while loop can run forever if the condition never becomes False. Always ensure something inside the loop changes the condition. If frozen, press Ctrl+C.",
          },
          {
            title: "The Accumulator Pattern",
            body: "One of the most common patterns — using a loop to build up a result:",
            code: `readings = [198, 228, 260, 235, 190, 245, 255, 230]
normal_count = 0
abnormal_count = 0

for v in readings:
    if 207 <= v <= 253:  # Python allows chained comparisons!
        normal_count += 1
    else:
        abnormal_count += 1

total = len(readings)
print(f"Normal: {normal_count}/{total} ({normal_count/total*100:.0f}%)")

# Python's built-ins do common accumulations in one line:
total_kwh = sum([45.2, 52.1, 38.7, 61.3, 49.8])
peak = max(readings)
print(f"Total: {total_kwh:.1f} kWh, Peak: {peak} V")`,
            afterCode: "Python's built-in sum(), min(), max(), and len() do common accumulations in one line. But understand the loop pattern first — you'll need it for custom logic.",
          },
        ],
        exercises: [
          {
            title: "Voltage Classifier",
            difficulty: "Starter",
            description: "Classify each reading as under-voltage / normal / over-voltage and print a summary.",
            starter: `readings = [198, 225, 230, 245, 260, 210, 255, 190]
under = normal = over = 0

# TODO: Loop and classify each reading
# TODO: Print a summary with counts`,
            solution: `readings = [198, 225, 230, 245, 260, 210, 255, 190]
under = normal = over = 0
for v in readings:
    if v < 207:
        under += 1
    elif v <= 253:
        normal += 1
    else:
        over += 1
print(f"Under: {under}  Normal: {normal}  Over: {over}")`,
          },
          {
            title: "Load Shedding Simulation",
            difficulty: "Intermediate",
            description: "Given a 24-hour demand profile and 4000 MW capacity, find how many hours have outages and when peak demand occurs.",
            starter: `capacity = 4000
demand = [2800,2600,2400,2300,2500,2900,3200,3800,
          4200,4500,4300,4100,3900,3700,3500,3800,
          4100,4600,4800,5000,4700,4200,3600,3100]

# TODO: Count hours where demand > capacity
# TODO: Find peak demand and the hour it occurred
# TODO: Calculate system availability %`,
            solution: `capacity = 4000
demand = [2800,2600,2400,2300,2500,2900,3200,3800,
          4200,4500,4300,4100,3900,3700,3500,3800,
          4100,4600,4800,5000,4700,4200,3600,3100]
outages = sum(1 for d in demand if d > capacity)
peak = max(demand)
peak_hour = demand.index(peak)
avail = (24 - outages) / 24 * 100
print(f"Outage hours: {outages}")
print(f"Peak: {peak} MW at {peak_hour:02d}:00")
print(f"Availability: {avail:.0f}%")`,
          },
        ],
      },
      {
        id: "1.3",
        title: "Functions & Modules",
        duration: "Days 8–11",
        aptiSkillId: "prog-python-basics",
        notes: [
          {
            title: "Why Functions?",
            body: "Imagine you calculate power dissipation in 15 different places in your code. If the formula changes, you'd have to fix all 15. A function lets you write the calculation once and reuse it everywhere.\n\nFunctions are the building blocks of real software. Every professional codebase is organised into functions.",
          },
          {
            title: "Defining and Calling Functions",
            body: "Use the def keyword, give it a name, list the inputs (parameters), and return the output:",
            code: `def calculate_power(voltage, resistance):
    """Calculate power dissipated in a resistor: P = V²/R."""
    current = voltage / resistance
    power = current ** 2 * resistance
    return power

# Using (calling) the function
p1 = calculate_power(230, 46)
print(f"Power: {p1} W")  # Power: 1150.0 W

# Reusable — call as many times as needed
for r in [10, 20, 30, 46, 100]:
    p = calculate_power(230, r)
    print(f"R={r} Ω → P={p:.1f} W")`,
            afterCode: "The triple-quoted string right after def is called a docstring. It documents what the function does. Always include one.",
          },
          {
            title: "Parameters, Defaults, and Return Values",
            body: "Functions can take multiple inputs and return multiple outputs. Parameters can have default values to make them optional:",
            code: `def voltage_divider(vin, r1, r2, load_r=None):
    """Calculate voltage divider output.
    If load_r provided, accounts for the loading effect."""
    if load_r:
        r2_loaded = (r2 * load_r) / (r2 + load_r)
    else:
        r2_loaded = r2

    vout = vin * r2_loaded / (r1 + r2_loaded)
    current = vin / (r1 + r2_loaded)
    return vout, current  # return TWO values as a tuple

# Unloaded
v, i = voltage_divider(12, 1000, 2000)
print(f"Unloaded: {v:.2f}V, {i*1000:.2f}mA")

# With a 5kΩ load
v, i = voltage_divider(12, 1000, 2000, load_r=5000)
print(f"Loaded:   {v:.2f}V, {i*1000:.2f}mA")`,
            afterCode: "load_r=None means the parameter is optional. If the caller doesn't provide it, it defaults to None. This pattern is very common in Python.",
          },
          {
            title: "Importing Modules",
            body: "Python has a huge library of ready-made tools. Import them to use:",
            code: `# Import whole module
import math
print(math.sqrt(2))           # 1.41421...
print(math.pi)                # 3.14159...
print(math.sin(math.radians(30)))  # 0.5

# Import specific things (no prefix needed)
from math import sqrt, pi, sin, radians
print(sqrt(2))

# Short alias
import math as m
print(m.cos(m.radians(60)))   # 0.5

# Modules you'll use constantly:
import os        # file and path operations
import csv       # CSV files
import json      # JSON files
import random    # random numbers (simulations)
import datetime  # dates and times

# Quick example
voltage = random.uniform(207, 253)
print(f"Simulated reading: {voltage:.1f} V")`,
          },
        ],
        exercises: [
          {
            title: "Engineering Toolkit",
            difficulty: "Starter",
            description: "Write reusable functions: impedance magnitude, Vrms from Vpeak, watts to dBm conversion.",
            starter: `import math

def impedance(r, xl, xc):
    """Z = sqrt(R² + (XL - XC)²)"""
    # TODO: implement
    pass

def vrms(vpeak):
    """Vpeak / sqrt(2)"""
    # TODO: implement
    pass

def watts_to_dbm(watts):
    """10 * log10(W / 0.001)"""
    # TODO: implement
    pass

# Test your functions:
# print(f"Z = {impedance(30, 40, 0):.1f} Ω")
# print(f"Vrms = {vrms(325):.1f} V")
# print(f"1W = {watts_to_dbm(1):.1f} dBm")`,
            solution: `import math

def impedance(r, xl, xc):
    return math.sqrt(r**2 + (xl - xc)**2)

def vrms(vpeak):
    return vpeak / math.sqrt(2)

def watts_to_dbm(watts):
    return 10 * math.log10(watts / 0.001)

print(f"Z = {impedance(30, 40, 0):.1f} Ω")
print(f"Vrms = {vrms(325):.1f} V")
print(f"1W = {watts_to_dbm(1):.1f} dBm")`,
          },
        ],
      },
      {
        id: "1.4",
        title: "Data Structures",
        duration: "Days 12–16",
        aptiSkillId: "prog-data-structures",
        notes: [
          {
            title: "Data Structures Overview",
            body: "So far you've worked with single values. But engineering involves collections: a series of voltage readings, a table of feeder data, a set of equipment IDs. Python gives you four built-in collection types:\n\n• list — ordered, changeable sequence\n• dict — key→value lookup table\n• tuple — ordered, immutable sequence\n• set — unique items, no order",
          },
          {
            title: "Lists — Ordered, Changeable",
            body: "Lists are the most versatile collection. Use them for any sequence of items.",
            code: `voltages = [228, 235, 260, 198, 245]
feeders = ["F1", "F2", "F3"]

# Accessing (indexing starts at 0!)
print(voltages[0])     # 228  — first
print(voltages[-1])    # 245  — last
print(voltages[1:3])   # [235, 260] — slice

# Modifying
voltages.append(232)        # add to end
voltages.insert(0, 230)     # insert at position
voltages.remove(260)        # remove first occurrence
voltages.sort()             # sort in place

# Useful operations
print(len(voltages))   # count
print(min(voltages))   # smallest
print(max(voltages))   # largest
print(sum(voltages))   # total
print(230 in voltages) # membership test — True or False`,
          },
          {
            title: "List Comprehensions",
            body: "A Python superpower — create new lists by transforming or filtering in one clean line:",
            code: `readings = [228, 235, 260, 198, 245, 210, 255, 190]

# Filter: keep only normal readings
normal = [v for v in readings if 207 <= v <= 253]
print(normal)  # [228, 235, 245, 210]

# Transform: watts to kilowatts
watts = [100, 200, 500, 1000, 1500]
kw = [w / 1000 for w in watts]
print(kw)  # [0.1, 0.2, 0.5, 1.0, 1.5]

# Transform AND filter in one expression
high_kw = [w/1000 for w in watts if w >= 500]
print(high_kw)  # [0.5, 1.0, 1.5]

# With enumerate for index + value
for i, v in enumerate(readings):
    print(f"Reading #{i+1}: {v}V")`,
            afterCode: "Pattern: [expression for item in iterable if condition]. Read as: 'give me [this] for each [item] in [collection] where [condition].'",
          },
          {
            title: "Dictionaries — Key-Value Pairs",
            body: "Dictionaries store data as key:value lookups. Perfect for structured data like equipment records:",
            code: `transformer = {
    "id": "TX-001",
    "rating_kva": 500,
    "voltage": 11000,
    "location": "Yenagoa",
    "loading": 78.5,
}

# Accessing
print(transformer["rating_kva"])         # 500
print(transformer.get("age", "N/A"))     # "N/A" — safe default

# Adding/modifying
transformer["age"] = 12
transformer["loading"] = 82.3

# Looping
for key, value in transformer.items():
    print(f"  {key}: {value}")

# Practical: count categories
readings = [228, 235, 260, 198, 245, 255]
counts = {"under": 0, "normal": 0, "over": 0}
for v in readings:
    if v < 207:    counts["under"] += 1
    elif v <= 253: counts["normal"] += 1
    else:          counts["over"] += 1
print(counts)`,
          },
          {
            title: "Tuples and Sets",
            body: "Two more types with specific purposes:",
            code: `# TUPLES — immutable (can't change after creation)
# Great for coordinates, fixed records, multiple return values
coordinate = (6.2104, 6.7968)  # latitude, longitude
phases = ("R", "Y", "B")

lat, lon = coordinate   # unpacking
print(f"Location: {lat}, {lon}")

# SETS — unique items only, no duplicates, unordered
readings = [230, 228, 230, 235, 228, 230]
unique = set(readings)
print(unique)  # {228, 230, 235}

# Set operations — like Venn diagrams
morning = {"F1", "F2", "F3", "F4"}
evening = {"F2", "F4", "F5", "F6"}
print(morning & evening)  # {'F2', 'F4'} — intersection (both)
print(morning | evening)  # all feeders — union
print(morning - evening)  # {'F1', 'F3'} — difference`,
          },
        ],
        exercises: [
          {
            title: "Grid Data Analyzer",
            difficulty: "Intermediate",
            description: "Analyse a weekly demand dataset using lists and dicts. Find daily averages, peaks, and overload events.",
            starter: `demand = {
    "Mon": [2800,2600,2400,2300,2500,2900,3200,3800,4200,4500,
            4300,4100,3900,3700,3500,3800,4100,4600,4800,5000,
            4700,4200,3600,3100],
    "Tue": [2700,2500,2300,2200,2400,2800,3100,3700,4100,4400,
            4200,4000,3800,3600,3400,3700,4000,4500,4700,4900,
            4600,4100,3500,3000],
}
CAPACITY = 4500

# TODO: For each day, print: avg demand, peak, overload hours`,
            solution: `demand = {
    "Mon": [2800,2600,2400,2300,2500,2900,3200,3800,4200,4500,
            4300,4100,3900,3700,3500,3800,4100,4600,4800,5000,
            4700,4200,3600,3100],
    "Tue": [2700,2500,2300,2200,2400,2800,3100,3700,4100,4400,
            4200,4000,3800,3600,3400,3700,4000,4500,4700,4900,
            4600,4100,3500,3000],
}
CAPACITY = 4500

for day, hours in demand.items():
    avg = sum(hours) / len(hours)
    peak = max(hours)
    overloads = [f"{h:02d}:00" for h, mw in enumerate(hours) if mw > CAPACITY]
    print(f"{day}: avg={avg:.0f}MW, peak={peak}MW")
    if overloads:
        print(f"  Overload hours: {', '.join(overloads)}")`,
          },
        ],
      },
      {
        id: "1.5",
        title: "File I/O & Error Handling",
        duration: "Days 17–21",
        aptiSkillId: "prog-data-structures",
        notes: [
          {
            title: "Why File I/O?",
            body: "Your engineering data lives in files — CSV from meters, JSON from APIs, text logs from SCADA. File I/O bridges Python and the real world. It's how you go from manual copy-paste to automated analysis pipelines.",
          },
          {
            title: "Reading and Writing Files",
            body: "The open() function with the 'with' statement ensures files are properly closed even if an error occurs:",
            code: `# WRITING
with open("report.txt", "w") as f:
    f.write("Daily Voltage Report\\n")
    f.write(f"Average: 231.5 V\\n")
    f.write(f"Peak: 248 V at 19:00\\n")

# READING all at once
with open("report.txt", "r") as f:
    content = f.read()
    print(content)

# READING line by line (better for large files)
with open("report.txt", "r") as f:
    for line in f:
        print(line.strip())  # strip() removes the trailing newline

# APPENDING (adds to end, doesn't overwrite)
with open("report.txt", "a") as f:
    f.write(f"Min: 198 V at 03:00\\n")`,
            afterCode: "The 'with' block automatically closes the file when done. Without it, a crash could leave files corrupted or locked.",
          },
          {
            title: "CSV Files",
            body: "CSV is the most common format for tabular engineering data:",
            code: `import csv

# WRITING CSV
data = [
    ["timestamp", "voltage", "current"],
    ["08:00", 228.5, 4.2],
    ["09:00", 231.2, 5.1],
    ["10:00", 229.8, 4.8],
]
with open("readings.csv", "w", newline="") as f:
    writer = csv.writer(f)
    for row in data:
        writer.writerow(row)

# READING CSV (DictReader uses header as keys)
with open("readings.csv", "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        v = float(row["voltage"])
        i = float(row["current"])
        print(f"{row['timestamp']}: V={v}V, P={v*i:.1f}W")`,
            afterCode: "csv.DictReader uses the header row as keys. row['voltage'] is clearer than row[1] and won't break if columns are reordered.",
          },
          {
            title: "Error Handling",
            body: "Real data is messy. Error handling keeps your program running when it encounters bad input:",
            code: `# Without handling — crashes on bad data
# value = int("abc")  → ValueError!

# With handling — continues gracefully
try:
    value = int("abc")
except ValueError:
    print("Invalid number — skipping")
    value = 0

# Practical: processing messy sensor data
raw = ["228.5", "231.2", "ERR", "", "225.8", "N/A"]
clean = []

for reading in raw:
    try:
        clean.append(float(reading))
    except ValueError:
        print(f"Skipped: '{reading}'")

print(f"Recovered {len(clean)}/{len(raw)} readings")
print(f"Mean: {sum(clean)/len(clean):.1f} V")`,
            afterCode: "Pattern: wrap risky code in try, handle specific error types in except. Never use bare except: without a type — it silently hides bugs.",
          },
        ],
        exercises: [
          {
            title: "Data Cleaner",
            difficulty: "Intermediate",
            description: "Parse a messy sensor reading list, skip invalid entries with try/except, and report statistics on the clean data.",
            starter: `raw = ["228.5", "231.2", "", "ERR", "225.8", "N/A", "230.1", "FAULT"]
clean = []

# TODO: Use try/except to convert each reading to float
# TODO: Print how many were recovered vs total
# TODO: Print mean, min, max of clean readings`,
            solution: `raw = ["228.5", "231.2", "", "ERR", "225.8", "N/A", "230.1", "FAULT"]
clean = []
for r in raw:
    try:
        clean.append(float(r))
    except ValueError:
        print(f"Skipped: '{r}'")
print(f"Recovered: {len(clean)}/{len(raw)}")
if clean:
    print(f"Mean: {sum(clean)/len(clean):.1f} V")
    print(f"Min: {min(clean)} V, Max: {max(clean)} V")`,
          },
        ],
      },
    ],
  },

  // ─── Phase 2: Data & Computation ────────────────────────────────────────────
  {
    id: 2,
    title: "Data & Computation",
    weeks: "Weeks 4–6",
    icon: "📊",
    accent: "blue",
    description: "NumPy, Pandas, Matplotlib — your engineering workbench",
    books: [
      { title: "Python for Data Analysis (3rd Ed)", author: "Wes McKinney", note: "By the creator of Pandas" },
      { title: "Scientific Computing with Python", author: "Claus Führer et al.", note: "Numerical methods for engineers" },
    ],
    resources: [
      { name: "NumPy Quickstart", url: "https://numpy.org/doc/stable/user/quickstart.html" },
      { name: "Pandas Getting Started", url: "https://pandas.pydata.org/docs/getting_started/" },
      { name: "Matplotlib Tutorials", url: "https://matplotlib.org/stable/tutorials/" },
    ],
    modules: [
      {
        id: "2.1",
        title: "NumPy",
        duration: "Days 22–27",
        aptiSkillId: "prog-data-structures",
        notes: [
          {
            title: "Why NumPy?",
            body: "Python lists are flexible but slow for numbers. NumPy is 50–100× faster because it stores data in contiguous memory and uses optimised C code underneath. You write Python, it runs at near-C speed.\n\nInstall once: pip install numpy",
            code: `import numpy as np

# The key difference — no explicit loops needed:
v = np.array([228, 235, 245, 210, 250])
r = 46

# Element-wise operations in one line:
current = v / r
power = v ** 2 / r
print(f"Power range: {power.min():.0f}–{power.max():.0f} W")`,
          },
          {
            title: "Creating Arrays",
            body: "NumPy arrays are the foundation of scientific Python:",
            code: `import numpy as np

# From a Python list
voltages = np.array([228, 235, 260, 198, 245])

# Special constructors
zeros  = np.zeros(5)              # [0. 0. 0. 0. 0.]
ones   = np.ones(5)               # [1. 1. 1. 1. 1.]
full   = np.full(5, 230.0)        # [230. 230. 230. 230. 230.]

# Sequences
count  = np.arange(0, 24)         # [0, 1, 2, ... 23]
time   = np.linspace(0, 0.02, 1000)  # 1000 points from 0 to 0.02s
# linspace is essential for generating waveforms

# Random — for simulations
noise  = np.random.normal(230, 5, 100)  # mean=230, std=5
print(f"Mean: {noise.mean():.1f}, Std: {noise.std():.1f}")

# 2D arrays (matrices)
matrix = np.array([[1, 2, 3], [4, 5, 6]])
print(matrix.shape)  # (2, 3)`,
          },
          {
            title: "Vectorized Operations — No Loops",
            body: "The core power of NumPy: operations apply to every element automatically:",
            code: `import numpy as np

v = np.array([228, 235, 245, 210, 250])
r = 46

# All at once — no for loop needed
current = v / r
power   = v ** 2 / r

# Boolean indexing — filter without loops
normal = v[(v >= 207) & (v <= 253)]   # & not 'and'
high   = v[v > 240]
print(f"Normal: {normal}")
print(f"High:   {high}")

# Statistics in one line
print(f"Mean:   {v.mean():.1f} V")
print(f"Median: {np.median(v):.1f} V")
print(f"Std:    {v.std():.1f} V")
rms = np.sqrt(np.mean(v ** 2))
print(f"RMS:    {rms:.1f} V")`,
          },
          {
            title: "AC Waveforms with NumPy",
            body: "NumPy makes waveform generation and analysis natural:",
            code: `import numpy as np

f = 50          # Hz
vp = 325        # Peak voltage (230 Vrms × √2)
ip = 14.14      # Peak current
phi = np.radians(30)  # Phase angle

# 1000 time samples over two cycles
t = np.linspace(0, 2/f, 1000)

v = vp * np.sin(2 * np.pi * f * t)
i = ip * np.sin(2 * np.pi * f * t - phi)

# Compute key quantities
vrms = np.sqrt(np.mean(v**2))
irms = np.sqrt(np.mean(i**2))
pavg = np.mean(v * i)          # Average real power

print(f"Vrms = {vrms:.1f} V")
print(f"Irms = {irms:.2f} A")
print(f"P_avg = {pavg:.1f} W")
print(f"PF = {pavg / (vrms * irms):.3f}")`,
          },
        ],
        exercises: [
          {
            title: "AC Waveform Analyser",
            difficulty: "Intermediate",
            description: "Generate voltage and current waveforms using NumPy. Calculate Vrms, Irms, average power, and power factor.",
            starter: `import numpy as np

f = 50           # Hz
vp = 325         # Peak voltage
ip = 14.14       # Peak current
phi = np.radians(30)  # Phase lag

t = np.linspace(0, 0.04, 1000)  # 2 cycles

# TODO: Generate v(t) and i(t) arrays
# TODO: Calculate Vrms = sqrt(mean(v²))
# TODO: Calculate average power P = mean(v * i)
# TODO: Calculate power factor PF = P / (Vrms × Irms)`,
            solution: `import numpy as np

f = 50; vp = 325; ip = 14.14
phi = np.radians(30)
t = np.linspace(0, 0.04, 1000)

v = vp * np.sin(2 * np.pi * f * t)
i = ip * np.sin(2 * np.pi * f * t - phi)

vrms = np.sqrt(np.mean(v**2))
irms = np.sqrt(np.mean(i**2))
pavg = np.mean(v * i)
pf   = pavg / (vrms * irms)

print(f"Vrms = {vrms:.1f} V")
print(f"Irms = {irms:.2f} A")
print(f"P_avg = {pavg:.1f} W")
print(f"PF = {pf:.3f}")`,
          },
        ],
      },
      {
        id: "2.2",
        title: "Pandas",
        duration: "Days 28–33",
        aptiSkillId: "prog-data-structures",
        notes: [
          {
            title: "What is Pandas?",
            body: "If NumPy is your calculator, Pandas is your intelligent spreadsheet. It handles labelled, tabular data — rows and columns with names and timestamps. Think Excel, but programmable and capable of millions of rows.\n\nInstall once: pip install pandas",
            code: `import pandas as pd

data = {
    "hour":    [0, 1, 2, 3, 4, 5],
    "voltage": [228.5, 231.2, 225.8, 222.1, 230.0, 233.4],
    "current": [4.2,   3.8,   3.5,   3.2,   4.0,   4.5],
}
df = pd.DataFrame(data)
print(df)

# Add a calculated column
df["power"] = df["voltage"] * df["current"]
print(df.head())  # show first 5 rows`,
          },
          {
            title: "Exploring and Filtering Data",
            body: "Pandas gives you powerful tools to understand and slice your dataset:",
            code: `import pandas as pd

# df.head()       — first 5 rows
# df.tail()       — last 5 rows
# df.shape        — (rows, columns)
# df.info()       — column types and null counts
# df.describe()   — statistics for numeric columns

# Filtering rows
df = pd.DataFrame({
    "feeder": ["F1","F2","F3","F1","F2","F3"],
    "hour":   [8,   8,   8,  20,  20,  20],
    "load_mw":[45,  32,  28,  62,  48,  35],
})

heavy   = df[df["load_mw"] > 40]
evening = df[(df["hour"] >= 18) & (df["load_mw"] > 40)]
print(heavy)

# GroupBy — split, apply, combine
avg_by_feeder = df.groupby("feeder")["load_mw"].mean()
print(avg_by_feeder)
# F1    53.5
# F2    40.0
# F3    31.5`,
          },
        ],
        exercises: [
          {
            title: "Feeder Availability Tracker",
            difficulty: "Challenge",
            description: "Rank feeders by 3-month average availability, flagging any below 70%.",
            starter: `import numpy as np

# Monthly availability % for each feeder
feeders = {
    "F1": [72, 68, 75],
    "F2": [85, 82, 88],
    "F3": [45, 42, 50],
    "F4": [91, 89, 93],
}

# TODO: Calculate average for each feeder
# TODO: Sort by average (highest first)
# TODO: Flag feeders below 70% with a warning`,
            solution: `import numpy as np

feeders = {"F1":[72,68,75],"F2":[85,82,88],"F3":[45,42,50],"F4":[91,89,93]}
avg = {f: np.mean(v) for f, v in feeders.items()}
ranked = sorted(avg.items(), key=lambda x: -x[1])
for rank, (f, a) in enumerate(ranked, 1):
    flag = " ⚠ BELOW TARGET" if a < 70 else ""
    print(f"{rank}. {f}: {a:.1f}%{flag}")`,
          },
        ],
      },
      {
        id: "2.3",
        title: "Matplotlib",
        duration: "Days 34–38",
        aptiSkillId: "prog-projects",
        notes: [
          {
            title: "Matplotlib Basics",
            body: "Turn numbers into visual stories. Install once: pip install matplotlib",
            code: `import matplotlib.pyplot as plt
import numpy as np

# Generate a 230V AC waveform
t = np.linspace(0, 0.04, 1000)   # 2 cycles at 50Hz
v = 325 * np.sin(2 * np.pi * 50 * t)

plt.figure(figsize=(10, 4))
plt.plot(t * 1000, v, color='steelblue', linewidth=1.5)
plt.xlabel("Time (ms)")
plt.ylabel("Voltage (V)")
plt.title("230 V AC Waveform — 50 Hz")
plt.grid(True, alpha=0.3)
plt.axhline(y=0, color='gray', linewidth=0.5)
plt.savefig("waveform.png", dpi=150, bbox_inches='tight')
plt.show()`,
          },
          {
            title: "Subplots for Engineering Dashboards",
            body: "Multiple charts in one figure — essential for reports:",
            code: `import matplotlib.pyplot as plt
import numpy as np

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

# Left: 24-hour load profile
hours = range(24)
demand = [2800,2600,2400,2300,2500,2900,3200,3800,
          4200,4500,4300,4100,3900,3700,3500,3800,
          4100,4600,4800,5000,4700,4200,3600,3100]
ax1.fill_between(hours, demand, alpha=0.2, color='steelblue')
ax1.plot(hours, demand, color='steelblue')
ax1.axhline(y=4500, color='red', linestyle='--', label='Capacity')
ax1.set_title("Load Profile")
ax1.set_xlabel("Hour")
ax1.set_ylabel("MW")
ax1.legend()

# Right: feeder availability bar chart
feeders = ["F1", "F2", "F3", "F4"]
avail   = [72, 85, 45, 91]
colors  = ['green' if a > 80 else 'orange' if a > 60 else 'red' for a in avail]
ax2.bar(feeders, avail, color=colors, edgecolor='white')
ax2.axhline(y=80, color='gray', linestyle='--', alpha=0.5)
ax2.set_title("Feeder Availability (%)")
ax2.set_ylim(0, 100)

plt.tight_layout()
plt.savefig("dashboard.png", dpi=150)`,
            afterCode: "Use the object-oriented approach (fig, ax = plt.subplots()) for any serious work. plt.tight_layout() prevents labels from overlapping.",
          },
        ],
        exercises: [
          {
            title: "Engineering Dashboard",
            difficulty: "Challenge",
            description: "Create a two-panel Matplotlib figure: left panel is a load profile with a capacity line, right panel is a bar chart of feeder availability coloured by status.",
            starter: `import matplotlib.pyplot as plt
import numpy as np

# Run this locally — requires matplotlib installed
# Data:
demand = [2800,2600,2400,2300,2500,2900,3200,3800,4200,4500,
          4300,4100,3900,3700,3500,3800,4100,4600,4800,5000,
          4700,4200,3600,3100]
feeders = ["F1","F2","F3","F4"]
avail   = [72, 85, 45, 91]
capacity = 4500

# TODO: Create fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
# TODO: ax1 — fill_between + plot + capacity line
# TODO: ax2 — bar chart, green if >80%, orange if >60%, red otherwise
# TODO: plt.tight_layout() and plt.show()`,
            solution: `import matplotlib.pyplot as plt

demand = [2800,2600,2400,2300,2500,2900,3200,3800,4200,4500,
          4300,4100,3900,3700,3500,3800,4100,4600,4800,5000,
          4700,4200,3600,3100]
feeders = ["F1","F2","F3","F4"]
avail   = [72, 85, 45, 91]
colors  = ['green' if a>80 else 'orange' if a>60 else 'red' for a in avail]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
ax1.fill_between(range(24), demand, alpha=0.2, color='steelblue')
ax1.plot(range(24), demand, 'steelblue')
ax1.axhline(4500, color='red', linestyle='--', label='Capacity')
ax1.set_title("Load Profile"); ax1.set_xlabel("Hour"); ax1.legend()

ax2.bar(feeders, avail, color=colors, edgecolor='white')
ax2.axhline(80, color='gray', linestyle='--', alpha=0.5)
ax2.set_title("Feeder Availability (%)"); ax2.set_ylim(0, 100)
plt.tight_layout(); plt.show()`,
          },
        ],
      },
    ],
  },

  // ─── Phase 3: Problem Solving ────────────────────────────────────────────────
  {
    id: 3,
    title: "Problem Solving",
    weeks: "Weeks 7–9",
    icon: "🧩",
    accent: "green",
    description: "Object-Oriented Programming and algorithms",
    books: [
      { title: "Fluent Python (2nd Ed)", author: "Luciano Ramalho", note: "Deep Python mastery — read after foundations" },
      { title: "Problem Solving with Algorithms", author: "Miller & Ranum", note: "Free online", url: "https://runestone.academy/ns/books/published/pythonds3/index.html" },
    ],
    resources: [
      { name: "Project Euler — Math Problems", url: "https://projecteuler.net" },
      { name: "Real Python Tutorials", url: "https://realpython.com" },
    ],
    modules: [
      {
        id: "3.1",
        title: "Object-Oriented Programming",
        duration: "Days 39–46",
        aptiSkillId: "prog-algorithms",
        notes: [
          {
            title: "What is OOP?",
            body: "Object-Oriented Programming bundles data AND functions together into objects that model real things. A Transformer has properties (rating, voltage, loading) and behaviours (check overload, generate report). OOP captures both in one place.\n\nThe alternative — scattering related data across multiple variables and separate functions — becomes unmanageable in large projects.",
          },
          {
            title: "Classes and Objects",
            body: "A class is a blueprint. An object is an instance built from it. Each instance has its own independent data:",
            code: `class Transformer:
    def __init__(self, name, rating_kva, v_pri, v_sec):
        self.name = name
        self.rating_kva = rating_kva
        self.v_pri = v_pri
        self.v_sec = v_sec
        self.load_kva = 0         # starts unloaded

    def loading_pct(self):
        return (self.load_kva / self.rating_kva) * 100

    def apply_load(self, kva):
        self.load_kva = kva
        pct = self.loading_pct()
        if pct > 100: return f"OVERLOADED {pct:.0f}%"
        elif pct > 80: return f"Heavy load {pct:.0f}%"
        else:          return f"Normal {pct:.0f}%"

    def __str__(self):
        return f"{self.name}: {self.rating_kva} kVA"

tx1 = Transformer("TX-001", 500, 11000, 415)
tx2 = Transformer("TX-002", 315, 11000, 415)

print(tx1)                     # TX-001: 500 kVA
print(tx1.apply_load(300))     # Normal 60%
print(tx1.apply_load(450))     # Heavy load 90%
print(tx2.apply_load(350))     # OVERLOADED 111%`,
            afterCode: "'self' refers to the specific instance. tx1.apply_load(300) makes self=tx1. Each object has independent data.",
          },
          {
            title: "Inheritance",
            body: "Create specialised versions of existing classes without rewriting their shared logic:",
            code: `class Generator:
    def __init__(self, name, capacity_mw, variable_cost):
        self.name = name
        self.capacity_mw = capacity_mw
        self.variable_cost = variable_cost   # ₦/MWh
        self.dispatch_mw = 0

    def dispatch(self, mw):
        self.dispatch_mw = min(mw, self.capacity_mw)
        return self.dispatch_mw

class GasGenerator(Generator):
    def __init__(self, name, capacity_mw, gas_price_per_mscf):
        cost = gas_price_per_mscf * 10    # rough ₦/MWh
        super().__init__(name, capacity_mw, cost)
        self.fuel = "Gas"

class SolarGenerator(Generator):
    def __init__(self, name, capacity_mw, capacity_factor=0.18):
        super().__init__(name, capacity_mw, 0)   # zero variable cost
        self.capacity_factor = capacity_factor

    def effective_capacity(self):
        return self.capacity_mw * self.capacity_factor

gas   = GasGenerator("Afam-VI", 650, 3.5)
solar = SolarGenerator("Katsina Solar", 75, 0.20)
print(f"{solar.name}: {solar.effective_capacity():.0f} MW effective")`,
          },
        ],
        exercises: [
          {
            title: "Grid Simulator",
            difficulty: "Challenge",
            description: "Build Generator, Load, and Grid classes. Grid.dispatch() should serve loads in priority order (merit order), highest-priority loads first.",
            starter: `class Generator:
    def __init__(self, name, capacity_mw, cost_per_mwh):
        pass  # TODO

class Load:
    def __init__(self, name, demand_mw, priority):  # 1=critical
        pass  # TODO

class Grid:
    def __init__(self):
        self.generators = []
        self.loads = []

    def dispatch(self):
        # TODO: Sort loads by priority (1 = serve first)
        # TODO: Sort generators by cost (cheapest first = merit order)
        # TODO: Serve loads until capacity runs out
        pass

g = Grid()
g.generators = [Generator("Hydro", 300, 5000), Generator("Gas", 500, 15000)]
g.loads = [Load("Hospital", 50, 1), Load("Residential", 350, 3), Load("Industrial", 200, 2)]
g.dispatch()`,
            solution: `class Generator:
    def __init__(self, name, cap, cost):
        self.name = name; self.cap = cap; self.cost = cost; self.out = 0

class Load:
    def __init__(self, name, mw, pri):
        self.name = name; self.mw = mw; self.pri = pri; self.served = False

class Grid:
    def __init__(self):
        self.generators = []; self.loads = []

    def dispatch(self):
        cap = sum(g.cap for g in self.generators)
        left = cap
        for load in sorted(self.loads, key=lambda l: l.pri):
            if left >= load.mw:
                load.served = True; left -= load.mw
                print(f"  Serving {load.name}: {load.mw} MW")
            else:
                print(f"  Shedding {load.name}: insufficient capacity")
        print(f"Total capacity: {cap} MW | Used: {cap-left} MW")

g = Grid()
g.generators = [Generator("Hydro", 300, 5000), Generator("Gas", 500, 15000)]
g.loads = [Load("Hospital", 50, 1), Load("Industrial", 200, 2), Load("Residential", 350, 3)]
g.dispatch()`,
          },
        ],
      },
    ],
  },

  // ─── Phase 4: Capstone ───────────────────────────────────────────────────────
  {
    id: 4,
    title: "Capstone",
    weeks: "Weeks 10–12",
    icon: "🚀",
    accent: "accent",
    description: "Build real engineering solutions",
    books: [
      { title: "Hands-On Machine Learning (3rd Ed)", author: "Aurélien Géron", note: "Start chapters 1–4 for ML foundations" },
      { title: "PyPSA Documentation", author: "PyPSA Team", note: "Open-source power system analysis", url: "https://pypsa.readthedocs.io" },
    ],
    resources: [
      { name: "Kaggle Energy Datasets", url: "https://www.kaggle.com/datasets?search=energy" },
      { name: "scikit-learn User Guide", url: "https://scikit-learn.org/stable/user_guide.html" },
      { name: "NERC Grid Data (Nigeria)", url: "https://nercng.org" },
    ],
    modules: [
      {
        id: "4.1",
        title: "Load Forecasting Tool",
        duration: "Days 47–56",
        aptiSkillId: "prog-projects",
        notes: [
          {
            title: "Capstone: Bringing It All Together",
            body: "This project combines everything into a real engineering tool: a short-term load forecasting system. You'll go from raw data to a trained model to a visual report.\n\nArchitecture:\n• data_loader.py — load and validate CSV data\n• features.py — extract time-based features (hour, day, weekend)\n• model.py — train and evaluate a regression model\n• forecast.py — generate 24-hour ahead predictions\n• visualise.py — create charts for reports\n\nStart simple (linear regression on hour-of-day), then add complexity one layer at a time.",
            code: `import numpy as np

# Step 1: Generate synthetic 30-day hourly demand
np.random.seed(42)
hours  = np.tile(np.arange(24), 30)         # 0..23 repeated 30 times
base   = 3000 + 1500 * np.sin(np.pi * hours / 12 - np.pi/3)
demand = base + np.random.normal(0, 200, len(hours))

# Step 2: Build feature matrix
X = np.column_stack([hours, hours**2])      # hour + hour² as features

# Step 3: Train/test split (last 5 days = test)
split = -120

# Step 4: Fit with least squares
coeffs = np.linalg.lstsq(X[:split], demand[:split], rcond=None)[0]

# Step 5: Evaluate
pred = X[split:] @ coeffs
rmse = np.sqrt(np.mean((demand[split:] - pred) ** 2))
print(f"RMSE: {rmse:.0f} MW")`,
            afterCode: "Start with this minimal example. Then upgrade: add Pandas for real CSV data, scikit-learn for better models (Random Forest, gradient boosting), and Matplotlib for visualisation.",
          },
        ],
        exercises: [
          {
            title: "Load Forecaster",
            difficulty: "Capstone",
            description: "Full pipeline: generate synthetic data → extract features → fit a least-squares model → evaluate RMSE → (bonus) plot actual vs predicted.",
            starter: `import numpy as np

np.random.seed(42)
hours  = np.tile(np.arange(24), 30)
demand = 3000 + 1500*np.sin(np.pi*hours/12) + np.random.normal(0, 200, len(hours))

# TODO: Build feature matrix X (at least: hour, hour²)
# TODO: Split into train (first 25 days) and test (last 5 days)
# TODO: Fit using np.linalg.lstsq
# TODO: Compute and print RMSE on the test set
# BONUS: Plot actual vs predicted using matplotlib`,
            solution: `import numpy as np

np.random.seed(42)
hours  = np.tile(np.arange(24), 30)
demand = 3000 + 1500*np.sin(np.pi*hours/12) + np.random.normal(0, 200, len(hours))

X = np.column_stack([hours, hours**2])
split = -120  # last 5 days

coeffs = np.linalg.lstsq(X[:split], demand[:split], rcond=None)[0]
pred   = X[split:] @ coeffs
rmse   = np.sqrt(np.mean((demand[split:] - pred)**2))
print(f"RMSE: {rmse:.0f} MW")

# Bonus: plot
try:
    import matplotlib.pyplot as plt
    plt.figure(figsize=(12,4))
    plt.plot(demand[split:], label='Actual', alpha=0.7)
    plt.plot(pred, label='Forecast', alpha=0.7)
    plt.legend(); plt.title(f"Load Forecast (RMSE={rmse:.0f} MW)")
    plt.show()
except ImportError:
    print("Install matplotlib to see the chart.")`,
          },
        ],
      },
    ],
  },
];
