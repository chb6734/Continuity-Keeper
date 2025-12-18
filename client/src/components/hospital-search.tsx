import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Building2, MapPin, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Hospital } from "@shared/schema";

interface HospitalSearchProps {
  hospitals: Hospital[];
  onSelect: (hospital: Hospital) => void;
  selectedId?: string;
  isLoading?: boolean;
}

export function HospitalSearch({ 
  hospitals, 
  onSelect, 
  selectedId,
  isLoading = false
}: HospitalSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredHospitals = useMemo(() => {
    if (!searchQuery.trim()) return hospitals;
    const query = searchQuery.toLowerCase();
    return hospitals.filter(h => 
      h.name.toLowerCase().includes(query) || 
      h.address.toLowerCase().includes(query)
    );
  }, [hospitals, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="병원 또는 의원 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12"
          data-testid="input-hospital-search"
        />
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredHospitals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">검색 결과가 없습니다</p>
            </CardContent>
          </Card>
        ) : (
          filteredHospitals.map((hospital) => (
            <Card
              key={hospital.id}
              className={cn(
                "cursor-pointer transition-colors hover-elevate",
                selectedId === hospital.id && "ring-2 ring-primary"
              )}
              onClick={() => onSelect(hospital)}
              data-testid={`card-hospital-${hospital.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{hospital.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{hospital.address}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
