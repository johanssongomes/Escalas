import datetime

def generate_calendar_2026():
    start_date = datetime.date(2026, 1, 1)
    
    # Folgas cycle
    folgas_cycle = ["D/S", "Q/S", "S/D", "T/Q"]
    
    # Starting steps for each team at Week 1 (i = 0)
    # Equipe A: D/S (0), Equipe B: T/Q (1), Equipe C: Q/S (2), Equipe D: S/D (3)
    team_start_offsets = {
        "Equipe A": 0,
        "Equipe B": 1,
        "Equipe C": 2,
        "Equipe D": 3
    }
    
    weeks_data = []
    
    for i in range(52):
        week_start = start_date + datetime.timedelta(weeks=i)
        date_str = week_start.strftime("%d/%m")
        
        week_info = {
            "Semana": i + 1,
            "Inicio": date_str
        }
        
        for team, start_offset in team_start_offsets.items():
            # Step in cycle for this week
            step = (start_offset + i) % 4
            week_info[team] = folgas_cycle[step]
            
        weeks_data.append(week_info)
        
    return weeks_data

def save_csv(data, filename):
    import csv
    headers = ["Colaborador / Equipe"] + [w["Inicio"] for w in data]
    
    rows = []
    for team in ["Equipe A", "Equipe B", "Equipe C", "Equipe D"]:
        row = [team]
        for w in data:
            row.append(w[team])
        rows.append(row)
        
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"CSV salvo com sucesso em: {filename}")

def print_markdown_table(data):
    # Print a transposed version (columns as weeks) for display
    headers = ["Equipe"] + [w["Inicio"] for w in data]
    print("| " + " | ".join(headers) + " |")
    print("|" + "|".join(["---"] * len(headers)) + "|")
    
    for team in ["Equipe A", "Equipe B", "Equipe C", "Equipe D"]:
        row = [team] + [w[team] for w in data]
        print("| " + " | ".join(row) + " |")

if __name__ == "__main__":
    data = generate_calendar_2026()
    save_csv(data, "calendario_escala_2026.csv")
    print("\nTabela gerada (resumo vertical para melhor visualização no console/chat):")
    print("| Semana | Início (Quinta) | Equipe A | Equipe B | Equipe C | Equipe D |")
    print("|---|---|---|---|---|---|")
    for w in data:
        print(f"| {w['Semana']} | {w['Inicio']} | {w['Equipe A']} | {w['Equipe B']} | {w['Equipe C']} | {w['Equipe D']} |")
